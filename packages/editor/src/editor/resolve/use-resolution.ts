import { useCallback, useEffect } from "react";
import type { ComponentData, Config, Data, Metadata } from "@puckeditor/core";
import { useActorRef, useSelector } from "@xstate/react";
import type { ResolveOp, ResolveOpEmit } from "../types.js";
import { resolutionLogic } from "./resolution-actor.js";

type HistoryResolution = {
  applyResolution: (patch: {
    entryId: string;
    nodeId: string;
    inputAtResolveTime: ComponentData;
    resolvedNode: ComponentData;
  }) => void;
  subscribeReset: (listener: () => void) => () => void;
};

export function useResolution({
  config,
  metadata,
  history,
}: {
  config: Config;
  metadata: Metadata;
  history: HistoryResolution;
}): {
  emitOp: ResolveOpEmit;
  resolvingIds: ReadonlySet<string>;
  errorIds: ReadonlySet<string>;
} {
  const actorRef = useActorRef(resolutionLogic, {
    input: { applyResolution: history.applyResolution },
  });
  const resolvingIds = useSelector(
    actorRef,
    (snapshot) => snapshot.context.resolvingIds,
  );
  const errorIds = useSelector(
    actorRef,
    (snapshot) => snapshot.context.errorIds,
  );

  useEffect(
    () => history.subscribeReset(() => actorRef.send({ type: "RESET" })),
    [actorRef, history.subscribeReset],
  );

  const emitOp: ResolveOpEmit = useCallback(
    (op: ResolveOp, entryId: string, data: Data) => {
      actorRef.send({
        type: "OP",
        op,
        entryId,
        data,
        config,
        metadata,
      });
    },
    [actorRef, config, metadata],
  );

  return { emitOp, resolvingIds, errorIds };
}
