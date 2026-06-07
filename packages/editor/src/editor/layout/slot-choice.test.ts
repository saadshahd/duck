import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import type { FiberRegistry } from "../fiber/index.js";
import { slotChoiceRect, slotChildAt } from "./slot-choice.js";

const rect = (x: number, y: number, w: number, h: number): DOMRect =>
  new DOMRect(x, y, w, h);

const card = (
  id: string,
  slots: Record<string, ComponentData[]>,
): ComponentData => ({
  type: "Card",
  props: { id, ...slots },
});

const text = (id: string): ComponentData => ({ type: "Text", props: { id } });

const data = (): Data => ({
  root: { props: {} },
  content: [
    card("card", {
      header: [text("h")],
      body: [text("b")],
      footer: [], // empty slot — must still resolve to a distinct band
    }),
  ],
});

/** A registry stub: the card spans 0..300 vertically; header child at the top,
 *  body child below. Empty footer has no child. */
const registry = (): FiberRegistry => {
  const rects: Record<string, DOMRect> = {
    card: rect(0, 0, 200, 300),
    h: rect(0, 0, 200, 80),
    b: rect(0, 90, 200, 80),
  };
  return {
    get: (id) =>
      rects[id]
        ? ({ getBoundingClientRect: () => rects[id] } as HTMLElement)
        : undefined,
    getNodeId: () => undefined,
    dispose: () => {},
  };
};

describe("slotChoiceRect", () => {
  test("measured slot → a non-empty band", () => {
    const r = slotChoiceRect({
      data: data(),
      parentId: "card",
      slotKey: "header",
      registry: registry(),
    });
    expect(r).toBeTruthy();
    expect(r!.height).toBeGreaterThan(0);
    expect(r!.width).toBeGreaterThan(0);
  });

  test("empty slot → a distinct band, not the whole parent", () => {
    const r = slotChoiceRect({
      data: data(),
      parentId: "card",
      slotKey: "footer",
      registry: registry(),
    });
    expect(r).toBeTruthy();
    // The carved empty band is far smaller than the 300px-tall parent.
    expect(r!.height).toBeLessThan(300);
  });

  test("unknown slot → undefined", () => {
    expect(
      slotChoiceRect({
        data: data(),
        parentId: "card",
        slotKey: "ghost",
        registry: registry(),
      }),
    ).toBeUndefined();
  });

  test("unknown parent → undefined", () => {
    expect(
      slotChoiceRect({
        data: data(),
        parentId: "nope",
        slotKey: "header",
        registry: registry(),
      }),
    ).toBeUndefined();
  });
});

describe("slotChildAt", () => {
  const args = (point: { x: number; y: number }) => ({
    data: data(),
    parentId: "card",
    slotKey: "body",
    registry: registry(),
    point,
  });

  test("point over a slot child → that child's id", () => {
    // body child 'b' spans y 90..170.
    expect(slotChildAt(args({ x: 100, y: 120 }))).toBe("b");
  });

  test("point in slot padding (no child under it) → undefined", () => {
    // Within the body band but below the only child's rect: padding.
    expect(slotChildAt(args({ x: 100, y: 250 }))).toBeUndefined();
  });

  test("empty slot → undefined for any point", () => {
    expect(
      slotChildAt({
        data: data(),
        parentId: "card",
        slotKey: "footer",
        registry: registry(),
        point: { x: 100, y: 120 },
      }),
    ).toBeUndefined();
  });

  test("unknown parent → undefined", () => {
    expect(
      slotChildAt({
        data: data(),
        parentId: "nope",
        slotKey: "body",
        registry: registry(),
        point: { x: 100, y: 120 },
      }),
    ).toBeUndefined();
  });
});
