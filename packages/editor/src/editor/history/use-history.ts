import { useCallback, useEffect, useRef } from "react";
import type { Spec } from "@json-render/core";
import { useActorRef, useSelector } from "@xstate/react";
import { historyLogic } from "./history-actor.js";
import type { HistoryContext, HistoryEvent } from "./types.js";

export type SpecPush = (spec: Spec, label: string, group?: string) => void;

type UseHistoryResult = {
  currentSpec: Spec;
  push: SpecPush;
  send: (event: HistoryEvent) => void;
  entries: HistoryContext["entries"];
  currentIndex: number;
};

export function useHistory(
  initialSpec: Spec,
  onSpecChange?: (spec: Spec) => void,
): UseHistoryResult {
  const actorRef = useActorRef(historyLogic, { input: { spec: initialSpec } });
  const ctx = useSelector(actorRef, (s) => s.context);
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
    (event: HistoryEvent) => actorRef.send(event),
    [actorRef],
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
  };
}
