import { useEffect, useRef } from "react";
import type { Spec } from "@json-render/core";
import equal from "fast-deep-equal";
import { buildParentMap, getAncestry } from "@json-render-editor/spec";
import type { SpecPush } from "../types.js";
import type { BrowserMessage, ServerMessage } from "@json-render-editor/spec";

type UseBridgeOptions = {
  url: string;
  page: string;
  selectedId: string | null;
  currentSpec: Spec;
  push: SpecPush;
};

type SendFn = (msg: BrowserMessage) => void;

const MAX_RETRIES = 5;
const BACKOFF_MS = [1000, 2000, 4000, 8000, 8000] as const;

export function useBridge({
  url,
  page,
  selectedId,
  currentSpec,
  push,
}: UseBridgeOptions): void {
  const latest = useRef({ page, selectedId, currentSpec, push });
  latest.current = { page, selectedId, currentSpec, push };

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
            if (
              !equal((msg as { spec: Spec }).spec, latest.current.currentSpec)
            ) {
              latest.current.push((msg as { spec: Spec }).spec, "Agent commit");
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
        ws = new WebSocket(url);

        ws.onopen = () => {
          retries = 0;
          sendRef.current = send;
          send({ type: "ready", page: latest.current.page });
          if (latest.current.selectedId) {
            send(
              selectionMessage(
                latest.current.currentSpec,
                latest.current.selectedId,
              ),
            );
          }
        };

        ws.onmessage = handleMessage;

        ws.onclose = () => {
          sendRef.current = null;
          if (disposed || retries >= MAX_RETRIES) return;
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
      sendRef.current?.(selectionMessage(currentSpec, selectedId));
    },
    [selectedId, currentSpec, page],
  );
}

function selectionMessage(spec: Spec, elementId: string): BrowserMessage {
  const parentMap = buildParentMap(spec);
  return {
    type: "selection-changed",
    elementId,
    ancestorIds: getAncestry(spec, parentMap, elementId).map((e) => e.id),
  };
}
