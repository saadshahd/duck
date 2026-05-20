import { fromTransition } from "xstate";
import type { ComponentData, Config, Data, Metadata } from "@puckeditor/core";
import { findById, findParentNode } from "@duckeditor/spec";
import type { Result } from "neverthrow";
import type { ResolveOp } from "../types.js";
import { hasResolver } from "../resolve-config.js";
import { invokeResolver } from "./invoke-resolver.js";
import type { ResolveError } from "./types.js";

type Inflight = { epoch: number; version: number };

type ApplyResolution = (patch: {
  entryId: string;
  nodeId: string;
  inputAtResolveTime: ComponentData;
  resolvedNode: ComponentData;
}) => void;

export type ResolutionContext = {
  epoch: number;
  versionCounters: Map<string, number>;
  inflight: Map<string, Inflight>;
  inputCache: Map<string, ComponentData>;
  resolvingIds: Set<string>;
  errorIds: Set<string>;
  applyResolution: ApplyResolution;
};

type OpEvent = {
  type: "OP";
  op: ResolveOp;
  entryId: string;
  data: Data;
  config: Config;
  metadata: Metadata;
};

export type ResolutionEvent =
  | OpEvent
  | {
      type: "SETTLED";
      epoch: number;
      id: string;
      version: number;
      entryId: string;
      inputAtResolveTime: ComponentData;
      result: Result<ComponentData, ResolveError>;
    }
  | { type: "RESET" };

type XStateEvent = { type: "xstate.init" } | { type: "xstate.stop" };
type ResolutionTransitionEvent = ResolutionEvent | XStateEvent;
type ResolutionEventOf<EventType extends ResolutionEvent["type"]> = Extract<
  ResolutionEvent,
  { type: EventType }
>;
type ResolutionTransitionEventOf<
  EventType extends ResolutionTransitionEvent["type"],
> = Extract<ResolutionTransitionEvent, { type: EventType }>;

type ResolutionInput = { applyResolution: ApplyResolution };

type ResolutionScope = {
  defer: (fn: () => void) => void;
  send: (event: ResolutionEvent) => void;
};

type Invocation = {
  epoch: number;
  version: number;
  id: string;
  entryId: string;
  inputAtResolveTime: ComponentData;
  node: ComponentData;
  parent: ComponentData | null;
  lastData: ComponentData | null;
  config: Config;
  metadata: Metadata;
  trigger: Exclude<ResolveOp, { type: "remove" }>["trigger"];
};

const idsForOp = (op: ResolveOp): readonly string[] =>
  "ids" in op ? op.ids : [op.id];

const withoutKeys = <T>({
  map,
  keys,
}: {
  map: Map<string, T>;
  keys: ReadonlySet<string>;
}): Map<string, T> => {
  const next = new Map(map);
  keys.forEach((key) => next.delete(key));
  return next;
};

const withoutValues = <T>({
  set,
  values,
}: {
  set: Set<T>;
  values: ReadonlySet<T>;
}): Set<T> => {
  const next = new Set(set);
  values.forEach((value) => next.delete(value));
  return next;
};

const cleanup = (
  ctx: ResolutionContext,
  ids: readonly string[],
): ResolutionContext => {
  const removed = new Set(ids);
  return {
    ...ctx,
    inputCache: withoutKeys({ map: ctx.inputCache, keys: removed }),
    inflight: withoutKeys({ map: ctx.inflight, keys: removed }),
    resolvingIds: withoutValues({ set: ctx.resolvingIds, values: removed }),
    errorIds: withoutValues({ set: ctx.errorIds, values: removed }),
  };
};

const queueTarget = (
  ctx: ResolutionContext,
  event: OpEvent,
  id: string,
  trigger: Invocation["trigger"],
): { context: ResolutionContext; invocation: Invocation | null } => {
  const node = findById(event.data, id);
  if (!node || !hasResolver(event.config, node)) {
    return { context: ctx, invocation: null };
  }

  const version = (ctx.versionCounters.get(id) ?? 0) + 1;
  const versionCounters = new Map(ctx.versionCounters).set(id, version);
  const inflight = new Map(ctx.inflight).set(id, {
    epoch: ctx.epoch,
    version,
  });
  const resolvingIds = new Set(ctx.resolvingIds).add(id);
  const errorIds = withoutValues({
    set: ctx.errorIds,
    values: new Set([id]),
  });
  const previousInput = ctx.inputCache.get(id) ?? null;
  const inputCache = new Map(ctx.inputCache).set(id, node);
  const next = {
    ...ctx,
    versionCounters,
    inflight,
    inputCache,
    resolvingIds,
    errorIds,
  };

  return {
    context: next,
    invocation: {
      epoch: ctx.epoch,
      version,
      id,
      entryId: event.entryId,
      inputAtResolveTime: node,
      node,
      parent: findParentNode(event.data, id),
      lastData: previousInput,
      config: event.config,
      metadata: event.metadata,
      trigger,
    },
  };
};

const startInvocation = (
  invocation: Invocation,
  send: ResolutionScope["send"],
) => {
  invokeResolver({
    config: invocation.config,
    node: invocation.node,
    parent: invocation.parent,
    lastData: invocation.lastData,
    metadata: invocation.metadata,
    trigger: invocation.trigger,
  }).then((result) =>
    send({
      type: "SETTLED",
      epoch: invocation.epoch,
      id: invocation.id,
      version: invocation.version,
      entryId: invocation.entryId,
      inputAtResolveTime: invocation.inputAtResolveTime,
      result,
    }),
  );
};

const handleOp = (
  ctx: ResolutionContext,
  event: OpEvent,
  scope?: ResolutionScope,
): ResolutionContext => {
  const ids = idsForOp(event.op);
  if (event.op.type === "remove") return cleanup(ctx, ids);
  const trigger = event.op.trigger;

  const queued = ids.reduce<{
    context: ResolutionContext;
    invocations: Invocation[];
  }>(
    (state, id) => {
      const next = queueTarget(state.context, event, id, trigger);
      return {
        context: next.context,
        invocations: next.invocation
          ? [...state.invocations, next.invocation]
          : state.invocations,
      };
    },
    { context: ctx, invocations: [] },
  );

  scope?.defer(() =>
    queued.invocations.forEach((invocation) =>
      startInvocation(invocation, scope.send),
    ),
  );

  return queued.context;
};

const handleSettled = (
  ctx: ResolutionContext,
  event: ResolutionEventOf<"SETTLED">,
  scope?: ResolutionScope,
): ResolutionContext => {
  const inflight = ctx.inflight.get(event.id);
  if (
    inflight?.epoch !== event.epoch ||
    inflight.version !== event.version
  ) {
    return ctx;
  }

  const nextInflight = new Map(ctx.inflight);
  nextInflight.delete(event.id);
  const staleId = new Set([event.id]);
  const resolvingIds = withoutValues({
    set: ctx.resolvingIds,
    values: staleId,
  });

  const errorIds = event.result.match(
    (resolvedNode) => {
      scope?.defer(() =>
        ctx.applyResolution({
          entryId: event.entryId,
          nodeId: event.id,
          inputAtResolveTime: event.inputAtResolveTime,
          resolvedNode,
        }),
      );
      return withoutValues({ set: ctx.errorIds, values: staleId });
    },
    () => new Set(ctx.errorIds).add(event.id),
  );

  return {
    ...ctx,
    inflight: nextInflight,
    resolvingIds,
    errorIds,
  };
};

const resetResolutionState = (ctx: ResolutionContext): ResolutionContext => ({
  ...ctx,
  epoch: ctx.epoch + 1,
  inputCache: new Map(),
  inflight: new Map(),
  resolvingIds: new Set(),
  errorIds: new Set(),
});

type Handler<EventType extends ResolutionTransitionEvent["type"]> = (
  ctx: ResolutionContext,
  event: ResolutionTransitionEventOf<EventType>,
  scope?: ResolutionScope,
) => ResolutionContext;

const ignoreInit: Handler<"xstate.init"> = (ctx) => ctx;
const ignoreStop: Handler<"xstate.stop"> = (ctx) => ctx;

const handlers = {
  OP: handleOp,
  SETTLED: handleSettled,
  RESET: resetResolutionState,
  "xstate.init": ignoreInit,
  "xstate.stop": ignoreStop,
} satisfies {
  [K in ResolutionTransitionEvent["type"]]: (
    ctx: ResolutionContext,
    event: ResolutionTransitionEventOf<K>,
    scope?: ResolutionScope,
  ) => ResolutionContext;
};

type AnyHandler = (
  ctx: ResolutionContext,
  event: ResolutionTransitionEvent,
  scope?: ResolutionScope,
) => ResolutionContext;

const handlerFor = (event: ResolutionTransitionEvent): AnyHandler =>
  handlers[event.type] as AnyHandler;

export const transition = (
  ctx: ResolutionContext,
  event: ResolutionTransitionEvent,
  scope?: ResolutionScope,
): ResolutionContext => handlerFor(event)(ctx, event, scope);

export const resolutionLogic = fromTransition(
  (ctx: ResolutionContext, event: ResolutionEvent, actorScope) =>
    transition(ctx, event, {
      defer: actorScope.defer,
      send: (next) => actorScope.self.send(next),
    }),
  ({ input }: { input: ResolutionInput }): ResolutionContext => ({
    epoch: 0,
    versionCounters: new Map(),
    inflight: new Map(),
    inputCache: new Map(),
    resolvingIds: new Set(),
    errorIds: new Set(),
    applyResolution: input.applyResolution,
  }),
);
