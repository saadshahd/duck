import { describe, test, expect } from "bun:test";
import { Cycle, type Destination } from "../layout/index.js";
import { resolveCycleStep } from "./step.js";

const dest = (
  parentId: string | null,
  slotKey: string | null,
  index: number,
  label: string,
): Destination =>
  parentId === null || slotKey === null
    ? { at: "root", index, label }
    : { at: "slot", parentId, path: [slotKey], index, label };

/** A stack rooted at deepest container "card": two slots, then root. */
const stack = (): Destination[] => [
  dest("card", "header", 1, "Card › header"),
  dest("card", "body", 0, "Card › body"),
  dest(null, null, 2, "Root"),
];

describe("resolveCycleStep — forward", () => {
  test("fresh cycle, pointer never moved → skips the invisible lock, lands one step past `from`", () => {
    const result = resolveCycleStep("forward", false, Cycle.idle, stack(), 0);
    expect(result).toEqual({ active: true, index: 1, anchorId: "card" });
  });

  test("fresh cycle, pointer has moved → normal lock-onto-aim first step", () => {
    const result = resolveCycleStep("forward", true, Cycle.idle, stack(), 1);
    expect(result).toEqual({ active: true, index: 1, anchorId: "card" });
  });

  test("already-active cycle, pointer never moved → normal single advance (no double-step)", () => {
    const active = { active: true, index: 0, anchorId: "card" };
    const result = resolveCycleStep("forward", false, active, stack(), 0);
    expect(result).toEqual({ active: true, index: 1, anchorId: "card" });
  });

  test("already-active cycle, pointer has moved → normal single advance", () => {
    const active = { active: true, index: 0, anchorId: "card" };
    const result = resolveCycleStep("forward", true, active, stack(), 0);
    expect(result).toEqual({ active: true, index: 1, anchorId: "card" });
  });

  test("fresh cycle, pointer never moved, wraps past the end on the skipped step", () => {
    const result = resolveCycleStep("forward", false, Cycle.idle, stack(), 2);
    expect(result).toEqual({ active: true, index: 0, anchorId: "card" });
  });

  test("empty stack stays idle regardless of pointerMoved", () => {
    expect(resolveCycleStep("forward", false, Cycle.idle, [], 0)).toEqual(
      Cycle.idle,
    );
    expect(resolveCycleStep("forward", true, Cycle.idle, [], 0)).toEqual(
      Cycle.idle,
    );
  });
});

describe("resolveCycleStep — back", () => {
  test("fresh cycle, pointer never moved → skips the invisible lock, lands one step before `from`", () => {
    const result = resolveCycleStep("back", false, Cycle.idle, stack(), 1);
    expect(result).toEqual({ active: true, index: 0, anchorId: "card" });
  });

  test("fresh cycle, pointer has moved → normal lock-onto-aim first step", () => {
    const result = resolveCycleStep("back", true, Cycle.idle, stack(), 1);
    expect(result).toEqual({ active: true, index: 1, anchorId: "card" });
  });

  test("already-active cycle → normal single reverse step regardless of pointerMoved", () => {
    const active = { active: true, index: 1, anchorId: "card" };
    expect(resolveCycleStep("back", false, active, stack(), 1)).toEqual({
      active: true,
      index: 0,
      anchorId: "card",
    });
    expect(resolveCycleStep("back", true, active, stack(), 1)).toEqual({
      active: true,
      index: 0,
      anchorId: "card",
    });
  });
});
