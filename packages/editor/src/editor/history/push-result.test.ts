import { describe, expect, test } from "bun:test";
import type { Data } from "@puckeditor/core";
import { classifyPushResult } from "./push-result.js";
import type { HistoryContext, Snapshot } from "./types.js";

const data = (id: string): Data => ({
  root: { props: {} },
  content: [{ type: "Box", props: { id } }],
});

const entry = (id: string): Snapshot => ({
  id,
  data: data(id),
  label: id,
  timestamp: 0,
});

const ctx = ({
  entries,
  currentIndex,
}: {
  entries: Snapshot[];
  currentIndex: number;
}): HistoryContext => ({
  entries,
  currentIndex,
  suppressNextOnChange: false,
});

describe("classifyPushResult", () => {
  test("unchanged when context identity did not change", () => {
    const before = ctx({ entries: [entry("a")], currentIndex: 0 });

    expect(classifyPushResult({ before, after: before })).toEqual({
      status: "unchanged",
    });
  });

  test("pushed when the current entry is new", () => {
    const before = ctx({ entries: [entry("a")], currentIndex: 0 });
    const after = ctx({ entries: [...before.entries, entry("b")], currentIndex: 1 });

    expect(classifyPushResult({ before, after })).toEqual({
      status: "pushed",
      entryId: "b",
    });
  });

  test("coalesced when the current entry id survives", () => {
    const original = entry("a");
    const before = ctx({ entries: [original], currentIndex: 0 });
    const after = ctx({
      entries: [{ ...original, label: "updated" }],
      currentIndex: 0,
    });

    expect(classifyPushResult({ before, after })).toEqual({
      status: "coalesced",
      entryId: "a",
    });
  });

  test("collapsed when the surviving entry is the previous one", () => {
    const first = entry("a");
    const second = entry("b");
    const before = ctx({ entries: [first, second], currentIndex: 1 });
    const after = ctx({ entries: [first], currentIndex: 0 });

    expect(classifyPushResult({ before, after })).toEqual({
      status: "collapsed",
      entryId: "a",
    });
  });
});
