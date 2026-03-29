import { describe, test, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { transition } from "./history-actor.js";
import type { HistoryContext } from "./types.js";

let autoId = 0;

const spec = (id?: string): Spec => {
  const resolved = id ?? `auto-${++autoId}`;
  return {
    root: resolved,
    elements: { [resolved]: { type: "Box", props: {} } },
  };
};

const empty: HistoryContext = { entries: [], currentIndex: -1 };

const push = (
  ctx: HistoryContext,
  label: string,
  opts?: { group?: string; timestamp?: number; specId?: string },
): HistoryContext =>
  transition(ctx, {
    type: "PUSH",
    spec: spec(opts?.specId),
    label,
    timestamp: opts?.timestamp ?? 0,
    ...(opts?.group && { group: opts.group }),
  });

// ── PUSH ──────────────────────────────────────────────

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
    ctx = transition(ctx, { type: "UNDO" }); // at index 0
    ctx = push(ctx, "d");
    expect(ctx.entries).toHaveLength(2);
    expect(ctx.currentIndex).toBe(1);
    expect(ctx.entries[1].label).toBe("d");
  });

  test("eviction at cap removes oldest unnamed", () => {
    let ctx = empty;
    for (let i = 0; i < 101; i++) ctx = push(ctx, `e-${i}`, { timestamp: i });
    expect(ctx.entries).toHaveLength(100);
    // oldest unnamed (e-0) evicted, so first entry is e-1
    expect(ctx.entries[0].label).toBe("e-1");
  });

  test("eviction skips named entries", () => {
    // push a named entry first, then fill to overflow
    let ctx = push(empty, "named-0", { timestamp: 0 });
    ctx = transition(ctx, { type: "RENAME", index: 0, name: "checkpoint" });
    for (let i = 1; i <= 100; i++) ctx = push(ctx, `e-${i}`, { timestamp: i });
    expect(ctx.entries).toHaveLength(100);
    // named entry should survive, e-1 (first unnamed) evicted
    expect(ctx.entries[0].label).toBe("named-0");
    expect(ctx.entries[0].name).toBe("checkpoint");
    expect(ctx.entries[1].label).toBe("e-2");
  });

  test("coalescing: same group replaces current entry", () => {
    let ctx = push(empty, "drag start", { group: "drag-1", timestamp: 10 });
    ctx = push(ctx, "drag move", { group: "drag-1", timestamp: 20 });
    expect(ctx.entries).toHaveLength(1);
    expect(ctx.entries[0].label).toBe("drag move");
    expect(ctx.entries[0].timestamp).toBe(10); // original timestamp preserved
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
    ctx = transition(ctx, { type: "UNDO" }); // at index 0, entries still [a, b]
    ctx = push(ctx, "c", { group: "g" });
    // Should NOT coalesce — not at end, so future is discarded and new entry appended
    expect(ctx.entries).toHaveLength(2);
    expect(ctx.entries[0].label).toBe("a");
    expect(ctx.entries[1].label).toBe("c");
  });

  test("append with identical spec to current is a no-op", () => {
    const ctx = push(empty, "a", { specId: "same" });
    const next = push(ctx, "b", { specId: "same" });
    expect(next).toBe(ctx);
  });

  test("coalesce that matches previous entry drops current entry", () => {
    // Entry 0: spec("base"), Entry 1: spec("changed") with group
    let ctx = push(empty, "base", { specId: "base" });
    ctx = push(ctx, "changed", { group: "g", specId: "changed" });
    expect(ctx.entries).toHaveLength(2);
    // Coalesce back to spec("base") — same as entry 0
    ctx = push(ctx, "reverted", { group: "g", specId: "base" });
    expect(ctx.entries).toHaveLength(1);
    expect(ctx.currentIndex).toBe(0);
    expect(ctx.entries[0].label).toBe("base");
  });

  test("coalesce at index 0 with identical spec returns unchanged", () => {
    // Only one entry with a group, push same spec with same group
    const ctx = push(empty, "only", { group: "g", specId: "x" });
    const next = push(ctx, "same", { group: "g", specId: "x" });
    // No previous entry to compare — coalesce replaces in-place (spec unchanged)
    expect(next.entries).toHaveLength(1);
    expect(next.entries[0].label).toBe("same");
  });

  test("append after undo with identical spec to new current is a no-op", () => {
    let ctx = push(push(empty, "a", { specId: "x" }), "b", { specId: "y" });
    ctx = transition(ctx, { type: "UNDO" }); // back to entry 0, spec("x")
    const next = push(ctx, "c", { specId: "x" }); // same spec as current
    expect(next).toBe(ctx);
  });
});

// ── UNDO ──────────────────────────────────────────────

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
    ctx = transition(ctx, { type: "UNDO" }); // index 1
    const next = transition(ctx, { type: "UNDO" });
    expect(next.currentIndex).toBe(0);
  });
});

// ── REDO ──────────────────────────────────────────────

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
    ctx = transition(ctx, { type: "UNDO" }); // index 0
    ctx = transition(ctx, { type: "REDO" }); // index 1
    const next = transition(ctx, { type: "REDO" });
    expect(next.currentIndex).toBe(2);
  });
});

// ── RENAME ────────────────────────────────────────────

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

// ── RESTORE ───────────────────────────────────────────

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
