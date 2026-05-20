import { useCallback, useEffect, useRef } from "react";
import type { Data } from "@puckeditor/core";
import { useActorRef, useSelector } from "@xstate/react";
import { historyLogic } from "./history-actor.js";
import { classifyPushResult } from "./push-result.js";
import { timelineVisibilityMachine } from "./timeline-visibility-machine.js";
import type {
  HistoryContext,
  HistoryEvent,
  HistoryEventPayload,
} from "./types.js";
import type { DataPush } from "../types.js";

const NAVIGATION_EVENTS = new Set(["UNDO", "REDO", "RESTORE"]);

type ApplyResolutionPatch = HistoryEventPayload<"APPLY_RESOLUTION">;

type UseHistoryResult = {
  currentData: Data;
  push: DataPush;
  reset: (data: Data) => void;
  applyResolution: (event: ApplyResolutionPatch) => void;
  subscribeReset: (listener: () => void) => () => void;
  send: (event: HistoryEvent) => void;
  entries: HistoryContext["entries"];
  currentIndex: number;
  visibilityState: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export function useHistory(
  initialData: Data,
  onDataChange?: (data: Data) => void,
): UseHistoryResult {
  const actorRef = useActorRef(historyLogic, { input: { data: initialData } });
  const visRef = useActorRef(timelineVisibilityMachine);
  const ctx = useSelector(actorRef, (s) => s.context);
  const visState = useSelector(visRef, (s) => s.value as string);
  const currentData = ctx.entries[ctx.currentIndex]?.data ?? initialData;
  const resetListeners = useRef(new Set<() => void>());

  const push: DataPush = useCallback(
    (data, label, group) => {
      const before = actorRef.getSnapshot().context;
      actorRef.send({
        type: "PUSH",
        data,
        label,
        timestamp: Date.now(),
        group,
      });
      return classifyPushResult({
        before,
        after: actorRef.getSnapshot().context,
      });
    },
    [actorRef],
  );

  const reset = useCallback(
    (data: Data) => {
      actorRef.send({ type: "RESET", data, timestamp: Date.now() });
      resetListeners.current.forEach((listener) => listener());
    },
    [actorRef],
  );

  const applyResolution = useCallback(
    (event: ApplyResolutionPatch) =>
      actorRef.send({ type: "APPLY_RESOLUTION", ...event }),
    [actorRef],
  );

  const subscribeReset = useCallback((listener: () => void) => {
    resetListeners.current.add(listener);
    return () => resetListeners.current.delete(listener);
  }, []);

  const send = useCallback(
    (event: HistoryEvent) => {
      actorRef.send(event);
      if (NAVIGATION_EVENTS.has(event.type)) {
        visRef.send({ type: "SHOW" });
      }
    },
    [actorRef, visRef],
  );

  const onMouseEnter = useCallback(
    () => visRef.send({ type: "MOUSE_ENTER" }),
    [visRef],
  );

  const onMouseLeave = useCallback(
    () => visRef.send({ type: "MOUSE_LEAVE" }),
    [visRef],
  );

  const dataRef = useRef(currentData);
  useEffect(() => {
    if (ctx.suppressNextOnChange) {
      dataRef.current = currentData;
      actorRef.send({ type: "ACK_SUPPRESSED_CHANGE" });
      return;
    }

    if (currentData !== dataRef.current) {
      dataRef.current = currentData;
      onDataChange?.(currentData);
    }
  }, [actorRef, currentData, ctx.suppressNextOnChange, onDataChange]);

  return {
    currentData,
    push,
    reset,
    applyResolution,
    subscribeReset,
    send,
    entries: ctx.entries,
    currentIndex: ctx.currentIndex,
    visibilityState: visState,
    onMouseEnter,
    onMouseLeave,
  };
}
