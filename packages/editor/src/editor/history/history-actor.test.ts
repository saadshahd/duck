import { describe, test, expect } from "bun:test";
import type { Data } from "@puckeditor/core";
import { transition } from "./history-actor.js";
import type { HistoryContext } from "./types.js";

let autoId = 0;

const data = (id?: string): Data => {
  const resolved = id ?? `auto-${++autoId}`;
  return {
    root: { props: {} },
    content: [{ type: "Box", props: { id: resolved } }],
  };
};

const empty: HistoryContext = { entries: [], currentIndex: -1 };

const push = (
  ctx: HistoryContext,
  label: string,
  opts?: { group?: string; timestamp?: number; dataId?: string },
): HistoryContext =>
  transition(ctx, {
    type: "PUSH",
    data: data(opts?.dataId),
    label,
    timestamp: opts?.timestamp ?? 0,
    ...(opts?.group && { group: opts.group }),
  });

// PUSH

describe("PUSH", () => {
  test("push to empty history", () => {
    const ctx = push(empty, "first");
    expect(ctx.entries).toHaveLength(1);
    expect(ctx.currentIndex).toBe(0);
    expect(ctx.entries[0].label).toBe("first");
  });

  test("push multiple grows entries", () => {
    const ctx = [1, 2, 3].reduce<HistoryContext>(
      (c, i) => push(c, `entry-${i}`),
      empty,
    );
    expect(ctx.entries).toHaveLength(3);
    expect(ctx.currentIndex).toBe(2);
  });

  test("push after undo discards future entries", () => {
    let ctx = push(push(push(empty, "a"), "b"), "c");
    ctx = transition(ctx, { type: "UNDO" });
    ctx = transition(ctx, { type: "UNDO" });
    ctx = push(ctx, "d");
    expect(ctx.entries).toHaveLength(2);
    expect(ctx.currentIndex).toBe(1);
    expect(ctx.entries[1].label).toBe("d");
  });

  test("eviction at cap removes oldest unnamed", () => {
    let ctx = empty;
    for (let i = 0; i < 101; i++) ctx = push(ctx, `e-${i}`, { timestamp: i });
    expect(ctx.entries).toHaveLength(100);
    expect(ctx.entries[0].label).toBe("e-1");
  });

  test("eviction skips named entries", () => {
    let ctx = push(empty, "named-0", { timestamp: 0 });
    ctx = transition(ctx, { type: "RENAME", index: 0, name: "checkpoint" });
    for (let i = 1; i <= 100; i++) ctx = push(ctx, `e-${i}`, { timestamp: i });
    expect(ctx.entries).toHaveLength(100);
    expect(ctx.entries[0].label).toBe("named-0");
    expect(ctx.entries[0].name).toBe("checkpoint");
    expect(ctx.entries[1].label).toBe("e-2");
  });

  test("coalescing: same group replaces current entry", () => {
    let ctx = push(empty, "drag start", { group: "drag-1", timestamp: 10 });
    ctx = push(ctx, "drag move", { group: "drag-1", timestamp: 20 });
    expect(ctx.entries).toHaveLength(1);
    expect(ctx.entries[0].label).toBe("drag move");
    expect(ctx.entries[0].timestamp).toBe(10);
  });

  test("coalescing: different group appends", () => {
    let ctx = push(empty, "a", { group: "g-a" });
    ctx = push(ctx, "b", { group: "g-b" });
    expect(ctx.entries).toHaveLength(2);
  });

  test("no coalescing without group", () => {
    let ctx = push(empty, "a");
    ctx = push(ctx, "b");
    expect(ctx.entries).toHaveLength(2);
  });

  test("no coalescing after undo (future discarded)", () => {
    let ctx = push(push(empty, "a", { group: "g" }), "b");
    ctx = transition(ctx, { type: "UNDO" });
    ctx = push(ctx, "c", { group: "g" });
    expect(ctx.entries).toHaveLength(2);
    expect(ctx.entries[0].label).toBe("a");
    expect(ctx.entries[1].label).toBe("c");
  });

  test("append with identical data to current is a no-op", () => {
    const ctx = push(empty, "a", { dataId: "same" });
    const next = push(ctx, "b", { dataId: "same" });
    expect(next).toBe(ctx);
  });

  test("coalesce that matches previous entry drops current entry", () => {
    let ctx = push(empty, "base", { dataId: "base" });
    ctx = push(ctx, "changed", { group: "g", dataId: "changed" });
    expect(ctx.entries).toHaveLength(2);
    ctx = push(ctx, "reverted", { group: "g", dataId: "base" });
    expect(ctx.entries).toHaveLength(1);
    expect(ctx.currentIndex).toBe(0);
    expect(ctx.entries[0].label).toBe("base");
  });

  test("coalesce at index 0 with identical data returns unchanged", () => {
    const ctx = push(empty, "only", { group: "g", dataId: "x" });
    const next = push(ctx, "same", { group: "g", dataId: "x" });
    expect(next.entries).toHaveLength(1);
    expect(next.entries[0].label).toBe("same");
  });

  test("append after undo with identical data to new current is a no-op", () => {
    let ctx = push(push(empty, "a", { dataId: "x" }), "b", { dataId: "y" });
    ctx = transition(ctx, { type: "UNDO" });
    const next = push(ctx, "c", { dataId: "x" });
    expect(next).toBe(ctx);
  });
});

// UNDO

describe("UNDO", () => {
  test("undo from end decrements", () => {
    const ctx = push(push(push(empty, "a"), "b"), "c");
    const next = transition(ctx, { type: "UNDO" });
    expect(next.currentIndex).toBe(1);
  });

  test("undo at 0 returns same context", () => {
    const ctx = push(empty, "a");
    const next = transition(ctx, { type: "UNDO" });
    expect(next).toBe(ctx);
  });

  test("undo from middle decrements", () => {
    let ctx = push(push(push(empty, "a"), "b"), "c");
    ctx = transition(ctx, { type: "UNDO" });
    const next = transition(ctx, { type: "UNDO" });
    expect(next.currentIndex).toBe(0);
  });
});

// REDO

describe("REDO", () => {
  test("redo from 0 increments", () => {
    let ctx = push(push(empty, "a"), "b");
    ctx = transition(ctx, { type: "UNDO" });
    const next = transition(ctx, { type: "REDO" });
    expect(next.currentIndex).toBe(1);
  });

  test("redo at end returns same context", () => {
    const ctx = push(push(empty, "a"), "b");
    const next = transition(ctx, { type: "REDO" });
    expect(next).toBe(ctx);
  });

  test("redo from middle increments", () => {
    let ctx = push(push(push(empty, "a"), "b"), "c");
    ctx = transition(ctx, { type: "UNDO" });
    ctx = transition(ctx, { type: "UNDO" });
    ctx = transition(ctx, { type: "REDO" });
    const next = transition(ctx, { type: "REDO" });
    expect(next.currentIndex).toBe(2);
  });
});

// RENAME

describe("RENAME", () => {
  test("rename valid index sets name", () => {
    const ctx = push(push(empty, "a"), "b");
    const next = transition(ctx, { type: "RENAME", index: 0, name: "save-1" });
    expect(next.entries[0].name).toBe("save-1");
    expect(next.entries[1]).toEqual(ctx.entries[1]);
  });

  test("rename negative index returns same context", () => {
    const ctx = push(empty, "a");
    expect(transition(ctx, { type: "RENAME", index: -1, name: "x" })).toBe(ctx);
  });

  test("rename out of bounds returns same context", () => {
    const ctx = push(empty, "a");
    expect(transition(ctx, { type: "RENAME", index: 5, name: "x" })).toBe(ctx);
  });

  test("rename updates existing name", () => {
    let ctx = push(empty, "a");
    ctx = transition(ctx, { type: "RENAME", index: 0, name: "v1" });
    ctx = transition(ctx, { type: "RENAME", index: 0, name: "v2" });
    expect(ctx.entries[0].name).toBe("v2");
  });
});

// RESTORE

describe("RESTORE", () => {
  test("restore to valid index updates currentIndex", () => {
    const ctx = push(push(push(empty, "a"), "b"), "c");
    const next = transition(ctx, { type: "RESTORE", index: 0 });
    expect(next.currentIndex).toBe(0);
  });

  test("restore to invalid index returns same context", () => {
    const ctx = push(empty, "a");
    expect(transition(ctx, { type: "RESTORE", index: 5 })).toBe(ctx);
    expect(transition(ctx, { type: "RESTORE", index: -1 })).toBe(ctx);
  });

  test("restore to current index returns same context", () => {
    const ctx = push(push(empty, "a"), "b");
    expect(transition(ctx, { type: "RESTORE", index: 1 })).toBe(ctx);
  });
});
