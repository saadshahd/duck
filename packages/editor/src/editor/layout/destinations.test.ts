import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import {
  destinationStack,
  resolveContainerId,
  resolveLabel,
  stepCycle,
} from "./destinations.js";
import { stubRegistry } from "../fiber/testing.js";

// --- Factories ---

const text = (id: string): ComponentData => ({
  type: "Text",
  props: { id, text: id },
});

const card = (
  id: string,
  slots: Record<string, ComponentData[]>,
): ComponentData => ({ type: "Card", props: { id, ...slots } });

const stack = (id: string, items: ComponentData[]): ComponentData => ({
  type: "Stack",
  props: { id, items },
});

const leaf = (id: string, type = "Text"): ComponentData => ({
  type,
  props: { id },
});

const stackData = (children: ComponentData[]): Data => ({
  root: { props: {} },
  content: [stack("container", children)],
});

// --- Tests ---

describe("destinationStack", () => {
  test("single container under point → its slots then beside-it in root", () => {
    const data: Data = {
      root: { props: {} },
      content: [
        text("a"),
        card("card", { header: [text("h")], body: [text("b")] }),
      ],
    };
    const registry = stubRegistry({ card: new DOMRect(0, 0, 200, 300) });

    expect(
      destinationStack({
        point: { x: 100, y: 150 },
        data,
        registry,
        excludeId: "a",
      }),
    ).toEqual([
      { parentId: "card", slotKey: "header", index: 1, label: "Card › header" },
      { parentId: "card", slotKey: "body", index: 1, label: "Card › body" },
      { parentId: null, slotKey: null, index: 2, label: "Root" },
    ]);
  });

  test("nested containers → deepest slots, beside-deepest, ancestor slots, beside-ancestor", () => {
    const data: Data = {
      root: { props: {} },
      content: [
        card("outer", {
          main: [card("inner", { body: [text("x")] })],
        }),
      ],
    };
    const registry = stubRegistry({
      outer: new DOMRect(0, 0, 400, 400),
      inner: new DOMRect(50, 50, 200, 200),
    });

    expect(
      destinationStack({
        point: { x: 100, y: 100 },
        data,
        registry,
        excludeId: "x",
      }),
    ).toEqual([
      { parentId: "inner", slotKey: "body", index: 1, label: "Card › body" },
      { parentId: "outer", slotKey: "main", index: 1, label: "Card › main" },
      { parentId: null, slotKey: null, index: 1, label: "Root" },
    ]);
  });

  test("excludeId and its descendants are not candidate containers nor beside-targets", () => {
    const data: Data = {
      root: { props: {} },
      content: [
        card("dragged", { body: [card("child", { inner: [text("y")] })] }),
        card("other", { slot: [] }),
      ],
    };
    const registry = stubRegistry({
      dragged: new DOMRect(0, 0, 200, 200),
      child: new DOMRect(10, 10, 100, 100),
      other: new DOMRect(0, 0, 200, 200),
    });

    expect(
      destinationStack({
        point: { x: 50, y: 50 },
        data,
        registry,
        excludeId: "dragged",
      }),
    ).toEqual([
      { parentId: "other", slotKey: "slot", index: 0, label: "Card › slot" },
      { parentId: null, slotKey: null, index: 2, label: "Root" },
    ]);
  });

  test("empty slot is reachable by identity at append index 0", () => {
    const data: Data = {
      root: { props: {} },
      content: [card("card", { header: [text("h")], footer: [] })],
    };
    const registry = stubRegistry({ card: new DOMRect(0, 0, 200, 300) });

    expect(
      destinationStack({
        point: { x: 100, y: 150 },
        data,
        registry,
        excludeId: "h",
      }),
    ).toEqual([
      { parentId: "card", slotKey: "header", index: 1, label: "Card › header" },
      { parentId: "card", slotKey: "footer", index: 0, label: "Card › footer" },
      { parentId: null, slotKey: null, index: 1, label: "Root" },
    ]);
  });

  test("point outside everything → empty stack", () => {
    const data: Data = {
      root: { props: {} },
      content: [card("card", { body: [text("b")] })],
    };
    const registry = stubRegistry({ card: new DOMRect(0, 0, 100, 100) });

    expect(
      destinationStack({
        point: { x: 500, y: 500 },
        data,
        registry,
        excludeId: "b",
      }),
    ).toEqual([]);
  });

  test("dedup collapses identical (parentId, slotKey, index) destinations", () => {
    // A single root-level container with one slot: beside-it (root append) and
    // the container's own slot are distinct; no collision expected, but a
    // container that is the only child of its parent slot must not duplicate the
    // beside-target with the ancestor's slot append.
    const data: Data = {
      root: { props: {} },
      content: [card("outer", { main: [card("inner", { body: [] })] })],
    };
    const registry = stubRegistry({
      outer: new DOMRect(0, 0, 400, 400),
      inner: new DOMRect(50, 50, 200, 200),
    });

    const stack = destinationStack({
      point: { x: 100, y: 100 },
      data,
      registry,
      excludeId: "nope",
    });

    // inner.body append (0), beside-inner in outer.main (1), outer.main append (1 → dedup), beside-outer in root (1)
    expect(stack).toEqual([
      { parentId: "inner", slotKey: "body", index: 0, label: "Card › body" },
      { parentId: "outer", slotKey: "main", index: 1, label: "Card › main" },
      { parentId: null, slotKey: null, index: 1, label: "Root" },
    ]);
  });

  test("overlapping non-ancestor siblings → deeper-in-tree wins, ties by document order", () => {
    const data: Data = {
      root: { props: {} },
      content: [card("first", { body: [] }), card("second", { body: [] })],
    };
    const registry = stubRegistry({
      first: new DOMRect(0, 0, 200, 200),
      second: new DOMRect(0, 0, 200, 200),
    });

    const stack = destinationStack({
      point: { x: 50, y: 50 },
      data,
      registry,
      excludeId: "nope",
    });

    // Same depth → document order: first before second.
    expect(stack.map((d) => d.parentId)).toEqual([
      "first",
      null,
      "second",
      null,
    ]);
  });
});

describe("stepCycle", () => {
  test("wraps forward", () => {
    expect(stepCycle(3, 0)).toBe(1);
    expect(stepCycle(3, 1)).toBe(2);
    expect(stepCycle(3, 2)).toBe(0);
  });

  test("zero length → 0", () => {
    expect(stepCycle(0, 0)).toBe(0);
  });
});

describe("resolveContainerId", () => {
  test("container target returns elementId directly", () => {
    expect(
      resolveContainerId(stackData([leaf("a")]), {
        kind: "container",
        elementId: "container",
        slotKey: "items",
        index: 1,
      }),
    ).toBe("container");
  });

  test("line target returns parent of elementId", () => {
    expect(
      resolveContainerId(stackData([leaf("a"), leaf("b"), leaf("c")]), {
        kind: "line",
        elementId: "b",
        edge: "bottom",
        axis: "vertical",
      }),
    ).toBe("container");
  });

  test("line target with orphan elementId returns null", () => {
    expect(
      resolveContainerId(stackData([leaf("a")]), {
        kind: "line",
        elementId: "orphan",
        edge: "top",
        axis: "vertical",
      }),
    ).toBeNull();
  });
});

describe("resolveLabel", () => {
  test("container target → 'Component › slot'", () => {
    expect(
      resolveLabel(stackData([leaf("a")]), {
        kind: "container",
        elementId: "container",
        slotKey: "items",
        index: 1,
      }),
    ).toBe("Stack › items");
  });

  test("line target → parent component type", () => {
    expect(
      resolveLabel(stackData([leaf("a"), leaf("b")]), {
        kind: "line",
        elementId: "b",
        edge: "bottom",
        axis: "vertical",
      }),
    ).toBe("Stack");
  });

  test("unknown container → null", () => {
    expect(
      resolveLabel(stackData([leaf("a")]), {
        kind: "container",
        elementId: "gone",
        slotKey: "items",
        index: 0,
      }),
    ).toBeNull();
  });

  test("orphan line target → null", () => {
    expect(
      resolveLabel(stackData([leaf("a")]), {
        kind: "line",
        elementId: "orphan",
        edge: "top",
        axis: "vertical",
      }),
    ).toBeNull();
  });
});
