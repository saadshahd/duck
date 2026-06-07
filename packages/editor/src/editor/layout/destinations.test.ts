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

    // inner.body append (0), beside-inner in outer.main (1), outer.main append
    // (1 → identity dup of beside-inner, dropped), beside-outer in root (1)
    expect(stack).toEqual([
      { parentId: "inner", slotKey: "body", index: 0, label: "Card › body" },
      { parentId: "outer", slotKey: "main", index: 1, label: "Card › main" },
      { parentId: null, slotKey: null, index: 1, label: "Root" },
    ]);
  });

  test("global identity dedup never repeats a (parentId, slotKey) — consecutive or not", () => {
    // inner is at index 0 in outer.body, and outer has a second child at index 1.
    // beside-inner = { parentId: "outer", slotKey: "body", index: 1, label: "Card › body" }
    // outer.body slot-append = { parentId: "outer", slotKey: "body", index: 2, label: "Card › body" }
    // Both share the same (parentId, slotKey) identity — global dedup keeps the
    // first and drops the rest, which trivially implies no consecutive dupes.
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

    // No two consecutive entries share the same (parentId, slotKey).
    const consecutiveIdentityDupes = result.filter(
      (d, i) =>
        i > 0 &&
        d.parentId === result[i - 1].parentId &&
        d.slotKey === result[i - 1].slotKey,
    );
    expect(consecutiveIdentityDupes).toEqual([]);
  });

  test("same-type nested containers with the same slot name are not deduplicated", () => {
    // outer (Card) and inner (Card) both have a 'body' slot. Their qualified
    // labels are both "Card › body", but they are distinct destinations with
    // different parentIds. The old label-based dedup incorrectly dropped one.
    const data: Data = {
      root: { props: {} },
      content: [
        card("outer", {
          body: [card("inner", { body: [] })],
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

    // "Card › body" for inner and "Card › body" for outer are both reachable.
    const bodySlots = result.filter((d) => d.label === "Card › body");
    expect(bodySlots.length).toBe(2);
    // They must target different parentIds.
    expect(bodySlots[0].parentId).toBe("inner");
    expect(bodySlots[1].parentId).toBe("outer");
  });

  test("sibling containers' slots are reachable without pointer movement (R9 full reach)", () => {
    // QA-3 N1: carrying from Card 1 › header, the cycle must enumerate the
    // sibling cards' slots — they are nowhere near the pointer.
    const data: Data = {
      root: { props: {} },
      content: [
        card("card1", { header: [text("h1")] }),
        card("card2", { body: [] }),
        card("card3", { main: [text("m")] }),
      ],
    };
    const registry = stubRegistry({
      card1: new DOMRect(0, 0, 200, 300),
      card2: new DOMRect(220, 0, 200, 300),
      card3: new DOMRect(440, 0, 200, 300),
    });

    expect(
      destinationStack({
        point: { x: 100, y: 150 },
        data,
        registry,
        excludeId: "h1",
      }),
    ).toEqual([
      {
        parentId: "card1",
        slotKey: "header",
        index: 1,
        label: "Card › header",
      },
      { parentId: null, slotKey: null, index: 1, label: "Root" },
      { parentId: "card2", slotKey: "body", index: 0, label: "Card › body" },
      { parentId: "card3", slotKey: "main", index: 1, label: "Card › main" },
    ]);
  });

  test("an excluded sibling container contributes no slots", () => {
    const data: Data = {
      root: { props: {} },
      content: [
        card("card1", { header: [] }),
        card("card2", { body: [text("b")] }),
      ],
    };
    const registry = stubRegistry({
      card1: new DOMRect(0, 0, 200, 300),
      card2: new DOMRect(220, 0, 200, 300),
    });

    expect(
      destinationStack({
        point: { x: 100, y: 150 },
        data,
        registry,
        excludeId: "card2",
      }),
    ).toEqual([
      {
        parentId: "card1",
        slotKey: "header",
        index: 0,
        label: "Card › header",
      },
      { parentId: null, slotKey: null, index: 1, label: "Root" },
    ]);
  });

  test("leaf siblings contribute nothing; uncles' slots surface at the ancestor level", () => {
    // inner sits in outer.main beside a leaf; outer has a sibling container
    // (aunt) at root. Each chain level emits own slots → beside-in-parent →
    // slot-bearing siblings. At the outer level: outer.main (own, deduped against
    // the beside-inner identity already seen) → Root (beside-outer) → aunt.slot.
    // Root therefore precedes aunt.
    const data: Data = {
      root: { props: {} },
      content: [
        card("outer", {
          main: [card("inner", { body: [] }), text("leaf")],
        }),
        card("aunt", { slot: [] }),
      ],
    };
    const registry = stubRegistry({
      outer: new DOMRect(0, 0, 400, 400),
      inner: new DOMRect(50, 50, 100, 100),
      aunt: new DOMRect(420, 0, 200, 200),
    });

    expect(
      destinationStack({
        point: { x: 100, y: 100 },
        data,
        registry,
        excludeId: "nope",
      }),
    ).toEqual([
      { parentId: "inner", slotKey: "body", index: 0, label: "Card › body" },
      { parentId: "outer", slotKey: "main", index: 1, label: "Card › main" },
      { parentId: null, slotKey: null, index: 1, label: "Root" },
      { parentId: "aunt", slotKey: "slot", index: 0, label: "Card › slot" },
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

    // Same depth → document order: first before second. At first's level:
    // first.body → Root (beside-first) → second.body (first's sibling). At
    // second's level every entry (second.body, Root, first.body) is already
    // seen by global identity dedup, so the level adds nothing.
    expect(stack.map((d) => d.parentId)).toEqual(["first", null, "second"]);
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

  test("empty-slot discrete container: a centered-stack marker is hit-testable, others via fallback", () => {
    // Two empty slots → centered stack. Aiming at the SECOND marker resolves
    // body (not the stack head) — markers are first-class targets even empty.
    // container 200×300; total 2*24+4=52; top=(300-52)/2=124 → m0 y∈[124,148],
    // m1 y∈[152,176]; x∈[20,180]. Point (100,164) lands on marker1 (body).
    const data: Data = {
      root: { props: {} },
      content: [card("card", { header: [], body: [] })],
    };
    const registry = stubRegistry({ card: new DOMRect(0, 0, 200, 300) });
    expect(
      aimDestination({
        point: { x: 100, y: 164 },
        data,
        registry,
        excludeId: "nope",
      })?.slotKey,
    ).toBe("body");
  });

  test("discrete container, point clear of every marker → falls back to the stack head", () => {
    // Point in the 4px gap between the two centered markers (y=150) hits no
    // marker → fall back to stack[0] (the cycle reaches the rest).
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

  test("scatter (interleaved children) discrete container: aiming a non-head marker resolves its slot", () => {
    // header child and body child overlap on both axes → discrete tiling.
    // Markers ride child midpoints: header y=75, body y=125, footer y=320.
    // Aiming the body marker center (100,125) resolves body — the pre-fix bug
    // resolved the stack head (header) here.
    const data: Data = {
      root: { props: {} },
      content: [
        card("card", {
          header: [text("h")],
          body: [text("b")],
          footer: [text("f")],
        }),
      ],
    };
    const registry = stubRegistry({
      card: new DOMRect(0, 0, 200, 500),
      h: new DOMRect(0, 0, 150, 150), // mid y = 75
      b: new DOMRect(50, 50, 150, 150), // mid y = 125, overlaps h → interleaved
      f: new DOMRect(25, 300, 40, 40), // mid y = 320
    });
    expect(
      aimDestination({
        point: { x: 100, y: 125 },
        data,
        registry,
        excludeId: "nope",
      })?.slotKey,
    ).toBe("body");
    // …and the footer marker resolves footer — the deepest scattered slot.
    expect(
      aimDestination({
        point: { x: 100, y: 320 },
        data,
        registry,
        excludeId: "nope",
      })?.slotKey,
    ).toBe("footer");
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
