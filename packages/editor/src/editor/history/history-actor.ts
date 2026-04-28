import { fromTransition } from "xstate";
import type { Data } from "@puckeditor/core";
import equal from "fast-deep-equal";
import type { HistoryContext, HistoryEvent, Snapshot } from "./types.js";

const MAX_ENTRIES = 100;

const replaceAt = <T>(arr: T[], i: number, item: T): T[] =>
  arr.map((x, j) => (j === i ? item : x));

const evictOldestUnnamed = (entries: Snapshot[]): Snapshot[] => {
  const i = entries.findIndex((e) => !e.name);
  return i === -1 ? entries : [...entries.slice(0, i), ...entries.slice(i + 1)];
};

const coalesce = (
  ctx: HistoryContext,
  event: Extract<HistoryEvent, { type: "PUSH" }>,
): HistoryContext | null => {
  const current = ctx.entries[ctx.currentIndex];
  const atEnd = ctx.currentIndex === ctx.entries.length - 1;
  if (!atEnd || !event.group || current?.group !== event.group) return null;

  const prev = ctx.entries[ctx.currentIndex - 1];
  if (prev && equal(event.data, prev.data)) {
    return {
      entries: ctx.entries.slice(0, ctx.currentIndex),
      currentIndex: ctx.currentIndex - 1,
    };
  }

  const entry = {
    ...current,
    data: event.data,
    label: event.label,
  };
  return {
    entries: replaceAt(ctx.entries, ctx.currentIndex, entry),
    currentIndex: ctx.currentIndex,
  };
};

const append = (
  ctx: HistoryContext,
  event: Extract<HistoryEvent, { type: "PUSH" }>,
): HistoryContext => {
  const current = ctx.entries[ctx.currentIndex];
  if (current && equal(event.data, current.data)) return ctx;

  const snapshot: Snapshot = {
    data: event.data,
    label: event.label,
    timestamp: event.timestamp,
    ...(event.group && { group: event.group }),
  };
  const entries = [...ctx.entries.slice(0, ctx.currentIndex + 1), snapshot];
  const currentIndex = entries.length - 1;
  if (entries.length <= MAX_ENTRIES) return { entries, currentIndex };
  const evicted = evictOldestUnnamed(entries);
  return {
    entries: evicted,
    currentIndex: currentIndex - (entries.length - evicted.length),
  };
};

const handlers: {
  [K in HistoryEvent["type"]]: (
    ctx: HistoryContext,
    event: Extract<HistoryEvent, { type: K }>,
  ) => HistoryContext;
} = {
  PUSH: (ctx, event) => coalesce(ctx, event) ?? append(ctx, event),

  UNDO: (ctx) =>
    ctx.currentIndex <= 0
      ? ctx
      : { ...ctx, currentIndex: ctx.currentIndex - 1 },

  REDO: (ctx) =>
    ctx.currentIndex >= ctx.entries.length - 1
      ? ctx
      : { ...ctx, currentIndex: ctx.currentIndex + 1 },

  RENAME: (ctx, event) =>
    event.index < 0 || event.index >= ctx.entries.length
      ? ctx
      : {
          entries: replaceAt(ctx.entries, event.index, {
            ...ctx.entries[event.index],
            name: event.name,
          }),
          currentIndex: ctx.currentIndex,
        },

  RESTORE: (ctx, event) =>
    event.index < 0 ||
    event.index >= ctx.entries.length ||
    event.index === ctx.currentIndex
      ? ctx
      : { ...ctx, currentIndex: event.index },
};

export const transition = (
  ctx: HistoryContext,
  event: HistoryEvent,
): HistoryContext => {
  const handler = handlers[event.type as HistoryEvent["type"]] as
    | ((ctx: HistoryContext, event: HistoryEvent) => HistoryContext)
    | undefined;
  return handler ? handler(ctx, event) : ctx;
};

type HistoryInput = { data: Data };

export const historyLogic = fromTransition(
  transition,
  ({ input }: { input: HistoryInput }): HistoryContext => ({
    entries: [
      {
        data: structuredClone(input.data),
        label: "Initial state",
        timestamp: Date.now(),
      },
    ],
    currentIndex: 0,
  }),
);
