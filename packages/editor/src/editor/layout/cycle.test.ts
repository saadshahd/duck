import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { Cycle, sameStatus } from "./cycle.js";
import type { Destination } from "./destinations.js";
import { stubRegistry, emptyRegistry } from "../fiber/testing.js";

// --- Factories ---

const dest = (
  parentId: string | null,
  slotKey: string | null,
  index: number,
  label: string,
): Destination => ({ parentId, slotKey, index, label });

/** A stack rooted at deepest container "card": two slots, then root. */
const stack = (): Destination[] => [
  dest("card", "header", 1, "Card › header"),
  dest("card", "body", 0, "Card › body"),
  dest(null, null, 2, "Root"),
];

const otherStack = (): Destination[] => [
  dest("box", "items", 0, "Box › items"),
  dest(null, null, 1, "Root"),
];

const text = (id: string): ComponentData => ({
  type: "Text",
  props: { id, text: id },
});

const card = (
  id: string,
  slots: Record<string, ComponentData[]>,
): ComponentData => ({ type: "Card", props: { id, ...slots } });

const cardData = (): Data => ({
  root: { props: {} },
  content: [card("card", { header: [text("h")], body: [text("b")] })],
});

// --- step ---

describe("step", () => {
  test("from idle on a non-empty stack → active at index 0, anchored to deepest", () => {
    expect(Cycle.step(Cycle.idle, stack())).toEqual({
      active: true,
      index: 0,
      anchorId: "card",
    });
  });

  test("empty stack → stays idle", () => {
    expect(Cycle.step(Cycle.idle, [])).toEqual(Cycle.idle);
  });

  test("advances within the same anchor, wrapping at the end", () => {
    const one = Cycle.step(Cycle.idle, stack());
    const two = Cycle.step(one, stack());
    const three = Cycle.step(two, stack());
    const four = Cycle.step(three, stack());
    expect([one.index, two.index, three.index, four.index]).toEqual([
      0, 1, 2, 0,
    ]);
  });

  test("anchor change restarts at the new anchor", () => {
    const active = { active: true, index: 2, anchorId: "card" };
    expect(Cycle.step(active, otherStack())).toEqual({
      active: true,
      index: 0,
      anchorId: "box",
    });
  });

  // --- anchor-at-hover: a fresh activation starts at the pointer's slot ---

  test("from idle with a hovered index → anchors AT that index, not the head", () => {
    expect(Cycle.step(Cycle.idle, stack(), 1)).toEqual({
      active: true,
      index: 1,
      anchorId: "card",
    });
  });

  test("anchor change with a hovered index → restarts at that index", () => {
    const active = { active: true, index: 2, anchorId: "card" };
    expect(Cycle.step(active, otherStack(), 1)).toEqual({
      active: true,
      index: 1,
      anchorId: "box",
    });
  });

  test("hovered index is honored only on the FIRST press; repeats advance from it", () => {
    const first = Cycle.step(Cycle.idle, stack(), 1);
    const second = Cycle.step(first, stack(), 1);
    const third = Cycle.step(second, stack(), 1);
    expect([first.index, second.index, third.index]).toEqual([1, 2, 0]);
  });

  test("from already not stack[0]: hovering body then stepping stays on body", () => {
    // The R5 law: stepping anchors at the hovered tile, never resets to header.
    const bodyIndex = 1;
    const stepped = Cycle.step(Cycle.idle, stack(), bodyIndex);
    expect(Cycle.selected(stepped, stack())).toEqual(stack()[bodyIndex]);
  });
});

// --- reclaim ---

describe("reclaim", () => {
  test("active cycle → idle (pointer reclaims selection)", () => {
    const active = Cycle.step(Cycle.idle, stack(), 2);
    expect(Cycle.reclaim(active)).toEqual(Cycle.idle);
  });

  test("idle → unchanged reference", () => {
    expect(Cycle.reclaim(Cycle.idle)).toBe(Cycle.idle);
  });

  test("step overrides, then reclaim hands control back to the pointer", () => {
    const stepped = Cycle.step(Cycle.idle, stack(), 0);
    expect(stepped.active).toBe(true);
    const reclaimed = Cycle.reclaim(stepped);
    expect(reclaimed.active).toBe(false);
    expect(Cycle.selected(reclaimed, stack())).toBeUndefined();
  });
});

// --- syncPointer ---

describe("syncPointer", () => {
  test("idle stays idle", () => {
    expect(Cycle.syncPointer(Cycle.idle, stack())).toEqual(Cycle.idle);
  });

  test("same deepest container → unchanged reference", () => {
    const active = Cycle.step(Cycle.idle, stack());
    expect(Cycle.syncPointer(active, stack())).toBe(active);
  });

  test("different deepest container → resets to idle", () => {
    const active = Cycle.step(Cycle.idle, stack());
    expect(Cycle.syncPointer(active, otherStack())).toEqual(Cycle.idle);
  });

  test("pointer left all containers (empty stack) → resets to idle", () => {
    const active = Cycle.step(Cycle.idle, stack());
    expect(Cycle.syncPointer(active, [])).toEqual(Cycle.idle);
  });
});

// --- selected ---

describe("selected", () => {
  test("idle → undefined", () => {
    expect(Cycle.selected(Cycle.idle, stack())).toBeUndefined();
  });

  test("active in range → the stack entry at index", () => {
    const active = { active: true, index: 1, anchorId: "card" };
    expect(Cycle.selected(active, stack())).toEqual(stack()[1]);
  });

  test("active out of range (stack shrank) → undefined", () => {
    const active = { active: true, index: 2, anchorId: "card" };
    expect(Cycle.selected(active, otherStack())).toBeUndefined();
  });
});

// --- toTarget ---

describe("toTarget", () => {
  test("container destination → container target with built tiling", () => {
    const target = Cycle.toTarget(
      dest("card", "body", 0, "Card › body"),
      cardData(),
      stubRegistry({ card: new DOMRect(0, 0, 200, 300) }),
    );
    expect(target).toMatchObject({
      kind: "container",
      elementId: "card",
      slotKey: "body",
      index: 0,
      activeLabel: "Card › body",
    });
  });

  test("root destination → root target carrying index and label", () => {
    expect(
      Cycle.toTarget(dest(null, null, 2, "Root"), cardData(), emptyRegistry),
    ).toEqual({ kind: "root", index: 2, label: "Root" });
  });
});

// --- status ---

describe("status", () => {
  test("active cycle + non-empty stack → stepping with 1-based index", () => {
    const active = { active: true, index: 1, anchorId: "card" };
    expect(Cycle.status(active, stack().length, "drag")).toEqual({
      phase: "stepping",
      step: 2,
      total: 3,
    });
  });

  test("active cycle + zero-length stack → entry with supplied modality", () => {
    const active = { active: true, index: 0, anchorId: "card" };
    expect(Cycle.status(active, 0, "carry")).toEqual({
      phase: "entry",
      modality: "carry",
    });
  });

  test("inactive cycle → entry with supplied modality", () => {
    expect(Cycle.status(Cycle.idle, stack().length, "drag")).toEqual({
      phase: "entry",
      modality: "drag",
    });
  });
});

// --- sameStatus ---

describe("sameStatus", () => {
  test("both null → equal", () => {
    expect(sameStatus(null, null)).toBe(true);
  });

  test("null vs present → not equal", () => {
    expect(sameStatus(null, { phase: "entry", modality: "drag" })).toBe(false);
    expect(sameStatus({ phase: "entry", modality: "drag" }, null)).toBe(false);
  });

  test("different phase → not equal", () => {
    expect(
      sameStatus(
        { phase: "entry", modality: "drag" },
        { phase: "stepping", step: 1, total: 2 },
      ),
    ).toBe(false);
  });

  test("entry: same modality → equal, different modality → not equal", () => {
    expect(
      sameStatus(
        { phase: "entry", modality: "carry" },
        { phase: "entry", modality: "carry" },
      ),
    ).toBe(true);
    expect(
      sameStatus(
        { phase: "entry", modality: "drag" },
        { phase: "entry", modality: "carry" },
      ),
    ).toBe(false);
  });

  test("stepping: same step/total → equal, any differ → not equal", () => {
    expect(
      sameStatus(
        { phase: "stepping", step: 2, total: 3 },
        { phase: "stepping", step: 2, total: 3 },
      ),
    ).toBe(true);
    expect(
      sameStatus(
        { phase: "stepping", step: 1, total: 3 },
        { phase: "stepping", step: 2, total: 3 },
      ),
    ).toBe(false);
  });
});
