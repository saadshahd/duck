import { fromTransition } from "xstate";
import type { ComponentData, Data } from "@puckeditor/core";
import { deepEqual } from "fast-equals";
import { findById, replaceById } from "@duckeditor/spec";
import type {
  HistoryContext,
  HistoryEvent,
  HistoryEventOf,
  Snapshot,
} from "./types.js";

const MAX_ENTRIES = 100;

type XStateEvent = { type: "xstate.init" } | { type: "xstate.stop" };
type HistoryTransitionEvent = HistoryEvent | XStateEvent;
type HistoryTransitionEventOf<
  EventType extends HistoryTransitionEvent["type"],
> = Extract<HistoryTransitionEvent, { type: EventType }>;

const createEntryId = (): string => crypto.randomUUID();

const replaceAt = <T>({
  items,
  index,
  item,
}: {
  items: T[];
  index: number;
  item: T;
}): T[] => items.map((x, i) => (i === index ? item : x));

const replaceEntry = ({
  ctx,
  index,
  entry,
}: {
  ctx: HistoryContext;
  index: number;
  entry: Snapshot;
}): HistoryContext => ({
  ...ctx,
  entries: replaceAt({ items: ctx.entries, index, item: entry }),
  currentIndex: ctx.currentIndex,
});

const hasEntryAt = (ctx: HistoryContext, index: number): boolean =>
  index >= 0 && index < ctx.entries.length;

const findEntry = (
  entries: Snapshot[],
  id: string,
):
  | { status: "found"; index: number; entry: Snapshot }
  | { status: "missing" } => {
  const index = entries.findIndex((entry) => entry.id === id);
  const entry = entries[index];
  return entry ? { status: "found", index, entry } : { status: "missing" };
};

const evictOldestUnnamed = (entries: Snapshot[]): Snapshot[] => {
  const i = entries.findIndex((e) => !e.name);
  return i === -1 ? entries : [...entries.slice(0, i), ...entries.slice(i + 1)];
};

type CoalesceResult =
  | { status: "coalesced"; ctx: HistoryContext }
  | { status: "not-coalesced" };

const coalesce = (
  ctx: HistoryContext,
  event: HistoryEventOf<"PUSH">,
): CoalesceResult => {
  const current = ctx.entries[ctx.currentIndex];
  const atEnd = ctx.currentIndex === ctx.entries.length - 1;
  if (!atEnd || !event.group || current?.group !== event.group) {
    return { status: "not-coalesced" };
  }

  const prev = ctx.entries[ctx.currentIndex - 1];
  if (prev && deepEqual(event.data, prev.data)) {
    return {
      status: "coalesced",
      ctx: {
        ...ctx,
        entries: ctx.entries.slice(0, ctx.currentIndex),
        currentIndex: ctx.currentIndex - 1,
      },
    };
  }

  const entry = {
    ...current,
    data: event.data,
    label: event.label,
  };
  return {
    status: "coalesced",
    ctx: replaceEntry({ ctx, index: ctx.currentIndex, entry }),
  };
};

const append = (
  ctx: HistoryContext,
  event: HistoryEventOf<"PUSH">,
): HistoryContext => {
  const current = ctx.entries[ctx.currentIndex];
  if (current && deepEqual(event.data, current.data)) return ctx;

  const snapshot: Snapshot = {
    id: createEntryId(),
    data: event.data,
    label: event.label,
    timestamp: event.timestamp,
    ...(event.group && { group: event.group }),
  };
  const entries = [...ctx.entries.slice(0, ctx.currentIndex + 1), snapshot];
  const currentIndex = entries.length - 1;
  if (entries.length <= MAX_ENTRIES) return { ...ctx, entries, currentIndex };
  const evicted = evictOldestUnnamed(entries);
  return {
    ...ctx,
    entries: evicted,
    currentIndex: currentIndex - (entries.length - evicted.length),
  };
};

const applyResolution = (
  ctx: HistoryContext,
  event: HistoryEventOf<"APPLY_RESOLUTION">,
): HistoryContext => {
  const patch = buildResolutionPatch(ctx, event);
  return patch
    ? replaceEntry({
        ctx,
        index: patch.entryIndex,
        entry: { ...patch.entry, data: patch.data },
      })
    : ctx;
};

type ResolutionPatch = {
  entryIndex: number;
  entry: Snapshot;
  data: Data;
};

const preserveResolvedId = (
  event: HistoryEventOf<"APPLY_RESOLUTION">,
): ComponentData => ({
  ...event.resolvedNode,
  props: { ...event.resolvedNode.props, id: event.nodeId },
});

const buildResolutionPatch = (
  ctx: HistoryContext,
  event: HistoryEventOf<"APPLY_RESOLUTION">,
): ResolutionPatch | null => {
  const entryMatch = findEntry(ctx.entries, event.entryId);
  if (entryMatch.status === "missing") return null;

  const { entry, index: entryIndex } = entryMatch;
  const target = findById(entry.data, event.nodeId);
  if (!target) return null;
  if (!deepEqual(target, event.inputAtResolveTime)) {
    return null;
  }

  const resolvedNode = preserveResolvedId(event);
  if (deepEqual(target, resolvedNode)) return null;

  const data = replaceById(entry.data, {
    id: event.nodeId,
    node: resolvedNode,
  });
  return data === entry.data ? null : { entryIndex, entry, data };
};

type Handler<EventType extends HistoryTransitionEvent["type"]> = (
  ctx: HistoryContext,
  event: HistoryTransitionEventOf<EventType>,
) => HistoryContext;

const push: Handler<"PUSH"> = (ctx, event) => {
  const result = coalesce(ctx, event);
  return result.status === "coalesced" ? result.ctx : append(ctx, event);
};

const reset: Handler<"RESET"> = (_ctx, event) => ({
  entries: [
    {
      id: createEntryId(),
      data: structuredClone(event.data),
      label: "Reset state",
      timestamp: event.timestamp,
    },
  ],
  currentIndex: 0,
  suppressNextOnChange: true,
});

const acknowledgeSuppressedChange: Handler<"ACK_SUPPRESSED_CHANGE"> = (ctx) =>
  ctx.suppressNextOnChange ? { ...ctx, suppressNextOnChange: false } : ctx;

const undo: Handler<"UNDO"> = (ctx) =>
  ctx.currentIndex <= 0
    ? ctx
    : { ...ctx, currentIndex: ctx.currentIndex - 1 };

const redo: Handler<"REDO"> = (ctx) =>
  ctx.currentIndex >= ctx.entries.length - 1
    ? ctx
    : { ...ctx, currentIndex: ctx.currentIndex + 1 };

const rename: Handler<"RENAME"> = (ctx, event) =>
  hasEntryAt(ctx, event.index)
    ? replaceEntry({
        ctx,
        index: event.index,
        entry: { ...ctx.entries[event.index], name: event.name },
      })
    : ctx;

const restore: Handler<"RESTORE"> = (ctx, event) =>
  hasEntryAt(ctx, event.index) && event.index !== ctx.currentIndex
    ? { ...ctx, currentIndex: event.index }
    : ctx;

const ignoreInit: Handler<"xstate.init"> = (ctx) => ctx;
const ignoreStop: Handler<"xstate.stop"> = (ctx) => ctx;

const handlers = {
  PUSH: push,
  APPLY_RESOLUTION: applyResolution,
  RESET: reset,
  ACK_SUPPRESSED_CHANGE: acknowledgeSuppressedChange,
  UNDO: undo,
  REDO: redo,
  RENAME: rename,
  RESTORE: restore,
  "xstate.init": ignoreInit,
  "xstate.stop": ignoreStop,
} satisfies {
  [EventType in HistoryTransitionEvent["type"]]: Handler<EventType>;
};

type AnyHandler = (
  ctx: HistoryContext,
  event: HistoryTransitionEvent,
) => HistoryContext;

const handlerFor = (event: HistoryTransitionEvent): AnyHandler =>
  handlers[event.type] as AnyHandler;

export const transition = (
  ctx: HistoryContext,
  event: HistoryTransitionEvent,
): HistoryContext => handlerFor(event)(ctx, event);

type HistoryInput = { data: Data };

export const historyLogic = fromTransition(
  transition,
  ({ input }: { input: HistoryInput }): HistoryContext => ({
    entries: [
      {
        id: createEntryId(),
        data: structuredClone(input.data),
        label: "Initial state",
        timestamp: Date.now(),
      },
    ],
    currentIndex: 0,
    suppressNextOnChange: false,
  }),
);
