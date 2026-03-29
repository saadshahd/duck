import { useCallback, useEffect, useRef } from "react";
import type { Spec } from "@json-render/core";
import { useActorRef, useSelector } from "@xstate/react";
import { historyLogic } from "./history-actor.js";
import { timelineVisibilityMachine } from "./timeline-visibility-machine.js";
import type { HistoryContext, HistoryEvent } from "./types.js";

export type SpecPush = (spec: Spec, label: string, group?: string) => void;

const NAVIGATION_EVENTS = new Set(["UNDO", "REDO", "RESTORE"]);

type UseHistoryResult = {
  currentSpec: Spec;
  push: SpecPush;
  send: (event: HistoryEvent) => void;
  entries: HistoryContext["entries"];
  currentIndex: number;
  visibilityState: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export function useHistory(
  initialSpec: Spec,
  onSpecChange?: (spec: Spec) => void,
): UseHistoryResult {
  const actorRef = useActorRef(historyLogic, { input: { spec: initialSpec } });
  const visRef = useActorRef(timelineVisibilityMachine);
  const ctx = useSelector(actorRef, (s) => s.context);
  const visState = useSelector(visRef, (s) => s.value as string);
  const currentSpec = ctx.entries[ctx.currentIndex]?.spec ?? initialSpec;

  const push: SpecPush = useCallback(
    (spec, label, group) =>
      actorRef.send({
        type: "PUSH",
        spec,
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

  const specRef = useRef(currentSpec);
  useEffect(() => {
    if (currentSpec !== specRef.current) {
      specRef.current = currentSpec;
      onSpecChange?.(currentSpec);
    }
  }, [currentSpec, onSpecChange]);

  return {
    currentSpec,
    push,
    send,
    entries: ctx.entries,
    currentIndex: ctx.currentIndex,
    visibilityState: visState,
    onMouseEnter,
    onMouseLeave,
  };
}
