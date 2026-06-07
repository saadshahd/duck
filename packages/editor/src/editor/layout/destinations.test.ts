import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import {
  destinationStack,
  aimDestination,
  stackIndexOf,
  resolveContainerId,
  resolveLabel,
  stepCycle,
  stepCycleBack,
  type Destination,
  type DropTarget,
} from "./destinations.js";
import { stubRegistry } from "../fiber/testing.js";

const containerTarget = (
  elementId: string,
  slotKey: string,
  index: number,
): DropTarget => ({
  kind: "container",
  elementId,
  slotKey,
  index,
  tiling: { kind: "discrete", slots: [{ slotKey }] },
  activeLabel: `${slotKey}`,
});

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

  test("consecutive-label dedup removes beside-then-slot-append with identical label", () => {
    // inner is at index 0 in outer.body, and outer has a second child at index 1.
    // beside-inner = { parentId: "outer", slotKey: "body", index: 1, label: "Card › body" }
    // outer.body slot-append = { parentId: "outer", slotKey: "body", index: 2, label: "Card › body" }
    // These differ in position key (index 1 vs 2) but share the same label —
    // the consecutive-label dedup removes the second, preventing a duplicate
    // "Card › body" announcement in the cycle.
    const data: Data = {
      root: { props: {} },
      content: [
        card("outer", {
          body: [card("inner", { slot: [] }), text("sibling")],
        }),
      ],
    };
    const registry = stubRegistry({
      outer: new DOMRect(0, 0, 400, 400),
      inner: new DOMRect(10, 10, 150, 150),
    });

    const result = destinationStack({
      point: { x: 50, y: 50 },
      data,
      registry,
      excludeId: "nope",
    });

    // Verify no two consecutive entries share the same label.
    const consecutiveDupes = result.filter(
      (d, i) => i > 0 && d.label === result[i - 1].label,
    );
    expect(consecutiveDupes).toEqual([]);
    // The label "Card › body" must appear at most once.
    expect(
      result.filter((d) => d.label === "Card › body").length,
    ).toBeLessThanOrEqual(1);
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

describe("aimDestination", () => {
  // A measured Card: header (top), body (two children), footer (empty/carved).
  // The parity case — drag hit-tests these bands, carry must too.
  const measuredCard = (): {
    data: Data;
    registry: ReturnType<typeof stubRegistry>;
  } => ({
    data: {
      root: { props: {} },
      content: [
        card("card", {
          header: [text("h1")],
          body: [text("b1"), text("b2")],
          footer: [],
        }),
      ],
    },
    registry: stubRegistry({
      card: new DOMRect(0, 0, 200, 300),
      h1: new DOMRect(10, 10, 180, 40),
      b1: new DOMRect(10, 60, 180, 100),
      b2: new DOMRect(10, 170, 180, 60),
    }),
  });

  const aimAt = (y: number): Destination | undefined => {
    const { data, registry } = measuredCard();
    return aimDestination({
      point: { x: 100, y },
      data,
      registry,
      excludeId: "nope",
    });
  };

  test("pointer over the header band → header (not always stack[0], but stack[0] here)", () => {
    expect(aimAt(30)?.slotKey).toBe("header");
  });

  test("pointer over the body band → body — the slot the pointer is actually over", () => {
    // Pre-R5 carry resolved stack[0] (header) here. Body must be reachable.
    expect(aimAt(110)?.slotKey).toBe("body");
  });

  test("pointer over the carved footer band → footer — deepest slot still reachable", () => {
    expect(aimAt(290)?.slotKey).toBe("footer");
  });

  test("body insert index is resolved from child geometry, not a blind append", () => {
    const above = aimAt(70); // near top of b1
    const below = aimAt(225); // below b2
    expect(above?.slotKey).toBe("body");
    expect(below?.slotKey).toBe("body");
    expect(below!.index).toBeGreaterThan(above!.index);
  });

  test("discrete container → falls back to the stack head (no aimable bands)", () => {
    // No measured children → discrete tiling → aim falls back to stack[0].
    const data: Data = {
      root: { props: {} },
      content: [card("card", { header: [], body: [] })],
    };
    const registry = stubRegistry({ card: new DOMRect(0, 0, 200, 300) });
    const stack = destinationStack({
      point: { x: 100, y: 150 },
      data,
      registry,
      excludeId: "nope",
    });
    expect(
      aimDestination({
        point: { x: 100, y: 150 },
        data,
        registry,
        excludeId: "nope",
      }),
    ).toEqual(stack[0]);
  });

  test("pointer over nothing → undefined (a dead zone names no destination)", () => {
    const data: Data = {
      root: { props: {} },
      content: [card("card", { body: [text("b")] })],
    };
    const registry = stubRegistry({ card: new DOMRect(0, 0, 100, 100) });
    expect(
      aimDestination({
        point: { x: 500, y: 500 },
        data,
        registry,
        excludeId: "b",
      }),
    ).toBeUndefined();
  });
});

describe("stackIndexOf", () => {
  const stack: Destination[] = [
    { parentId: "card", slotKey: "header", index: 1, label: "Card › header" },
    { parentId: "card", slotKey: "body", index: 0, label: "Card › body" },
    { parentId: null, slotKey: null, index: 2, label: "Root" },
  ];

  test("matches on parent/slot, ignoring the precise index", () => {
    expect(
      stackIndexOf(stack, {
        parentId: "card",
        slotKey: "body",
        index: 99,
        label: "x",
      }),
    ).toBe(1);
  });

  test("matches the root destination (both null)", () => {
    expect(
      stackIndexOf(stack, {
        parentId: null,
        slotKey: null,
        index: 0,
        label: "Root",
      }),
    ).toBe(2);
  });

  test("no matching slot → -1", () => {
    expect(
      stackIndexOf(stack, {
        parentId: "other",
        slotKey: "x",
        index: 0,
        label: "y",
      }),
    ).toBe(-1);
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

describe("stepCycleBack", () => {
  test("wraps reverse: (i−1+N)%N", () => {
    expect(stepCycleBack(3, 1)).toBe(0);
    expect(stepCycleBack(3, 2)).toBe(1);
    // Wrap-around: index 0 → last
    expect(stepCycleBack(3, 0)).toBe(2);
  });

  test("zero length → 0", () => {
    expect(stepCycleBack(0, 0)).toBe(0);
  });

  test("reverse step is inverse of forward step", () => {
    // One forward then one back returns to origin.
    const origin = 1;
    const forward = stepCycle(3, origin);
    const back = stepCycleBack(3, forward);
    expect(back).toBe(origin);
  });
});

describe("resolveContainerId", () => {
  test("container target returns elementId directly", () => {
    expect(
      resolveContainerId(
        stackData([leaf("a")]),
        containerTarget("container", "items", 1),
      ),
    ).toBe("container");
  });

  test("no-target returns elementId directly", () => {
    expect(
      resolveContainerId(stackData([leaf("a")]), {
        kind: "none",
        elementId: "container",
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
      resolveLabel(
        stackData([leaf("a")]),
        containerTarget("container", "items", 1),
      ),
    ).toBe("Stack › items");
  });

  test("no-target → constant label", () => {
    expect(
      resolveLabel(stackData([leaf("a")]), {
        kind: "none",
        elementId: "container",
      }),
    ).toBe("No target here");
  });

  test("line target → 'Component › slot'", () => {
    expect(
      resolveLabel(stackData([leaf("a"), leaf("b")]), {
        kind: "line",
        elementId: "b",
        edge: "bottom",
        axis: "vertical",
      }),
    ).toBe("Stack › items");
  });

  test("unknown container → null", () => {
    expect(
      resolveLabel(stackData([leaf("a")]), containerTarget("gone", "items", 0)),
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

  test("line target labels carry the qualified slot", () => {
    // Section(id "s1") with slot "content" containing two children c1, c2
    const section = (id: string, children: ComponentData[]): ComponentData => ({
      type: "Section",
      props: { id, content: children },
    });
    const data: Data = {
      root: { props: {} },
      content: [section("s1", [leaf("c1"), leaf("c2")])],
    };
    const target: DropTarget = {
      kind: "line",
      elementId: "c2",
      edge: "top",
      axis: "vertical",
    };
    expect(resolveLabel(data, target)).toBe("Section › content");
  });

  test("root-level line target labels as Root", () => {
    const data: Data = {
      root: { props: {} },
      content: [leaf("child1"), leaf("child2")],
    };
    const target: DropTarget = {
      kind: "line",
      elementId: "child1",
      edge: "top",
      axis: "vertical",
    };
    expect(resolveLabel(data, target)).toBe("Root");
  });
});
