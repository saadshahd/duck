import type { DataPushResult } from "../types.js";
import type { HistoryContext, Snapshot } from "./types.js";

type PushResultInput = {
  before: HistoryContext;
  after: HistoryContext;
};

type PushResultEntryInput = PushResultInput & {
  entry: Snapshot;
};

const currentEntry = (ctx: HistoryContext): Snapshot | null =>
  ctx.entries[ctx.currentIndex] ?? null;

const previousEntry = (ctx: HistoryContext): Snapshot | null =>
  ctx.entries[ctx.currentIndex - 1] ?? null;

const collapsedIntoPrevious = ({
  before,
  after,
  entry,
}: PushResultEntryInput): boolean =>
  previousEntry(before)?.id === entry.id &&
  after.entries.length === before.entries.length - 1;

const entryExistedBefore = ({
  before,
  entry,
}: {
  before: HistoryContext;
  entry: Snapshot;
}): boolean => before.entries.some((candidate) => candidate.id === entry.id);

export const classifyPushResult = ({
  before,
  after,
}: PushResultInput): DataPushResult => {
  if (before === after) return { status: "unchanged" };

  const entry = currentEntry(after);
  if (!entry) return { status: "unchanged" };

  if (collapsedIntoPrevious({ before, after, entry })) {
    return { status: "collapsed", entryId: entry.id };
  }

  return entryExistedBefore({ before, entry })
    ? { status: "coalesced", entryId: entry.id }
    : { status: "pushed", entryId: entry.id };
};
