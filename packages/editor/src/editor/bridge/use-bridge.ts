import { useEffect, useRef, useState } from "react";
import type { Data } from "@puckeditor/core";
import equal from "fast-deep-equal";
import {
  buildParentMap,
  getAncestry,
  type BrowserMessage,
  type ServerMessage,
} from "@duck/spec";
import type { DataPush } from "../types.js";

export type BridgeStatus = "connecting" | "connected" | "disconnected";

type UseBridgeOptions = {
  url: string;
  page: string;
  selectedId: string | null;
  currentData: Data;
  push: DataPush;
};

type SendFn = (msg: BrowserMessage) => void;

const MAX_RETRIES = 5;
const BACKOFF_MS = [1000, 2000, 4000, 8000, 8000] as const;

export function useBridge({
  url,
  page,
  selectedId,
  currentData,
  push,
}: UseBridgeOptions): { status: BridgeStatus } {
  const [status, setStatus] = useState<BridgeStatus>("connecting");
  const latest = useRef({ page, selectedId, currentData, push });
  latest.current = { page, selectedId, currentData, push };

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

      function handleMessage(event: MessageEvent) {
        const msg = JSON.parse(event.data) as ServerMessage;
        const dispatch: Record<ServerMessage["type"], () => void> = {
          "spec-update": () => {
            const incoming = (
              msg as Extract<ServerMessage, { type: "spec-update" }>
            ).data;
            if (!equal(incoming, latest.current.currentData)) {
              latest.current.push(incoming, "Agent commit");
            }
          },
          "capture-request": () => {
            // No capture support yet — let the server time out naturally
          },
        };
        dispatch[msg.type]?.();
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
