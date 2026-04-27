import { useCallback, useEffect, useRef } from "react";
import type { Data } from "@puckeditor/core";
import { useActorRef, useSelector } from "@xstate/react";
import { historyLogic } from "./history-actor.js";
import { timelineVisibilityMachine } from "./timeline-visibility-machine.js";
import type { HistoryContext, HistoryEvent } from "./types.js";
import type { DataPush } from "../types.js";

const NAVIGATION_EVENTS = new Set(["UNDO", "REDO", "RESTORE"]);

type UseHistoryResult = {
  currentData: Data;
  push: DataPush;
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

  const push: DataPush = useCallback(
    (data, label, group) =>
      actorRef.send({
        type: "PUSH",
        data,
        label,
        timestamp: Date.now(),
        group,
      }),
    [actorRef],
  );

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
    if (currentData !== dataRef.current) {
      dataRef.current = currentData;
      onDataChange?.(currentData);
    }
  }, [currentData, onDataChange]);

  return {
    currentData,
    push,
    send,
    entries: ctx.entries,
    currentIndex: ctx.currentIndex,
    visibilityState: visState,
    onMouseEnter,
    onMouseLeave,
  };
}
