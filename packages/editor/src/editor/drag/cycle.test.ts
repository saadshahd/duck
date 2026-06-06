import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { Cycle } from "./cycle.js";
import type { Destination } from "../layout/index.js";
import { stubRegistry, emptyRegistry } from "./drag-test-fixtures.js";

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

  test("anchor change restarts at index 0 with the new anchor", () => {
    const active = { active: true, index: 2, anchorId: "card" };
    expect(Cycle.step(active, otherStack())).toEqual({
      active: true,
      index: 0,
      anchorId: "box",
    });
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
