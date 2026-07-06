import { useEffect, useRef, useState } from "react";
import type { Config, Data } from "@puckeditor/core";
import { deepEqual } from "fast-equals";
import {
  buildParentMap,
  getAncestry,
  type BrowserMessage,
  type ServerMessage,
} from "@duckeditor/spec";
import type { EditorCommit } from "../types.js";
import { resolverIds } from "../resolve-config.js";
import { captureImage } from "./capture-responder.js";

export type BridgeStatus = "connecting" | "connected" | "disconnected";

type UseBridgeOptions = {
  url: string;
  page: string;
  selectedId: string | null;
  currentData: Data;
  config: Config;
  commit: EditorCommit;
};

type SendFn = (msg: BrowserMessage) => void;
type SpecUpdateMessage = Extract<ServerMessage, { type: "spec-update" }>;
type CaptureRequestMessage = Extract<
  ServerMessage,
  { type: "capture-request" }
>;

const MAX_RETRIES = 5;
const BACKOFF_MS = [1000, 2000, 4000, 8000, 8000] as const;

const isSpecUpdate = (msg: ServerMessage): msg is SpecUpdateMessage =>
  msg.type === "spec-update";

const isCaptureRequest = (msg: ServerMessage): msg is CaptureRequestMessage =>
  msg.type === "capture-request";

export function useBridge({
  url,
  page,
  selectedId,
  currentData,
  config,
  commit,
}: UseBridgeOptions): { status: BridgeStatus } {
  const [status, setStatus] = useState<BridgeStatus>("connecting");
  const latest = useRef({
    page,
    selectedId,
    currentData,
    config,
    commit,
  });
  latest.current = { page, selectedId, currentData, config, commit };

  const sendRef = useRef<SendFn | null>(null);

  useEffect(
    function connectBridge() {
      let ws: WebSocket | null = null;
      let retries = 0;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      let disposed = false;

      const send: SendFn = (msg) => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        }
      };

      function handleSpecUpdate(msg: SpecUpdateMessage) {
        const incoming = msg.data;
        if (deepEqual(incoming, latest.current.currentData)) return;

        latest.current.commit({
          beforeData: latest.current.currentData,
          afterData: incoming,
          label: "Agent commit",
          resolve: {
            kind: "force",
            ids: resolverIds({
              data: incoming,
              config: latest.current.config,
            }),
          },
        });
      }

      function handleCaptureRequest(msg: CaptureRequestMessage) {
        captureImage(msg)
          .then((image) =>
            send({ type: "capture-response", id: msg.id, image }),
          )
          .catch(() => {
            // No response is sent on capture failure; the server-side request
            // times out and surfaces that to the MCP caller as a QueryError.
          });
      }

      function handleMessage(event: MessageEvent) {
        const msg = JSON.parse(event.data) as ServerMessage;
        if (isSpecUpdate(msg)) handleSpecUpdate(msg);
        if (isCaptureRequest(msg)) handleCaptureRequest(msg);
      }

      function connect() {
        if (disposed) return;
        setStatus("connecting");
        ws = new WebSocket(url);

        ws.onopen = () => {
          retries = 0;
          setStatus("connected");
          sendRef.current = send;
          send({ type: "ready", page: latest.current.page });
          if (latest.current.selectedId) {
            send(
              selectionMessage(
                latest.current.currentData,
                latest.current.selectedId,
              ),
            );
          }
        };

        ws.onmessage = handleMessage;

        ws.onclose = () => {
          sendRef.current = null;
          if (disposed) return;
          if (retries >= MAX_RETRIES) {
            setStatus("disconnected");
            return;
          }
          reconnectTimer = setTimeout(connect, BACKOFF_MS[retries]);
          retries++;
        };

        ws.onerror = () => ws?.close();
      }

      connect();

      return () => {
        disposed = true;
        sendRef.current = null;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        ws?.close();
      };
    },
    [url],
  );

  useEffect(
    function syncSelection() {
      if (!selectedId) return;
      sendRef.current?.(selectionMessage(currentData, selectedId));
    },
    [selectedId, currentData, page],
  );

  return { status };
}

function selectionMessage(data: Data, elementId: string): BrowserMessage {
  const parentMap = buildParentMap(data);
  return {
    type: "selection-changed",
    elementId,
    ancestorIds: getAncestry(parentMap, elementId).map((e) => e.id),
  };
}
