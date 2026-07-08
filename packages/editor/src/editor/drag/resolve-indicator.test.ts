import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { resolveIndicator } from "./resolve-indicator.js";
import type { DropTarget } from "../layout/index.js";
import {
  text,
  box,
  bag,
  stubRegistry,
  emptyRegistry,
} from "./drag-test-fixtures.js";

// --- Factories ---

const data = (): Data => ({
  root: { props: {} },
  content: [
    text("a"),
    text("b"),
    text("c"),
    box("box", [text("d"), text("e")]),
  ],
});

const card = (
  id: string,
  slots: Record<string, ComponentData[]>,
): ComponentData => ({
  type: "Card",
  props: { id, ...slots },
});

const cardData = (): Data => ({
  root: { props: {} },
  content: [
    text("a"),
    card("card", {
      header: [text("h1")],
      body: [text("b1"), text("b2")],
      footer: [],
    }),
  ],
});

const cardRegistry = () =>
  stubRegistry({
    card: new DOMRect(0, 0, 200, 300),
    h1: new DOMRect(10, 10, 180, 40),
    b1: new DOMRect(10, 60, 180, 100),
    b2: new DOMRect(10, 170, 180, 60),
  });

const sourceA = () =>
  bag({
    elementId: "a",
    at: "root",
    index: 0,
    role: "sibling",
  });

const containerTarget = (slotKey: string, index: number): DropTarget => ({
  kind: "container",
  elementId: "card",
  path: [slotKey],
  index,
  tiling: { kind: "discrete", slots: [{ path: [slotKey] }] },
  activeLabel: `Card › ${slotKey}`,
});

const resolve = (overrides: Partial<Parameters<typeof resolveIndicator>[0]>) =>
  resolveIndicator({
    source: sourceA(),
    target: undefined,
    point: { x: 0, y: 0 },
    previous: null,
    data: data(),
    registry: emptyRegistry,
    descendantSet: new Set(),
    ...overrides,
  });

// --- Tests ---

describe("resolveIndicator", () => {
  test("returns null when target is undefined", () => {
    expect(resolve({})).toBeNull();
  });

  test("returns null for self-drop", () => {
    expect(resolve({ target: sourceA() })).toBeNull();
  });

  test("returns null when target is a descendant", () => {
    const source = bag({
      elementId: "box",
      at: "root",
      index: 3,
      role: "sibling",
    });
    const target = bag({
      elementId: "d",
      at: "slot",
      parentId: "box",
      path: ["items"],
      index: 0,
      role: "sibling",
    });
    expect(
      resolve({ source, target, descendantSet: new Set(["d", "e"]) }),
    ).toBeNull();
  });

  test("single-slot container with no measurable geometry → append into slots[0]", () => {
    // Source lives inside the box (different parent slot from root) so the
    // same-parent guard does not fire — this tests pure container resolution.
    const source = bag({
      elementId: "d",
      at: "slot",
      parentId: "box",
      path: ["items"],
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "box",
      at: "root",
      index: 3,
      role: "container",
    });
    // source.parentId = "box", target.parentId = null → different parent, no guard
    expect(resolve({ source, target })).toMatchObject({
      kind: "container",
      elementId: "box",
      path: ["items"],
      index: 1, // length of items minus d (source removed) = 1
      activeLabel: "Box › items",
    });
  });

  test("append into the source's own slot when already last → null (no-op)", () => {
    const source = bag({
      elementId: "e",
      at: "slot",
      parentId: "box",
      path: ["items"],
      index: 1,
      role: "sibling",
    });
    const target = bag({
      elementId: "box",
      at: "root",
      index: 3,
      role: "container",
    });
    expect(resolve({ source, target })).toBeNull();
  });

  test("multi-slot container: pointer resolves slot, index, and carries a tiling", () => {
    // Source lives inside the card's header slot → different parent from root
    const source = bag({
      elementId: "h1",
      at: "slot",
      parentId: "card",
      path: ["header"],
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "card",
      at: "root",
      index: 1,
      role: "container",
    });
    const indicator = resolve({
      source,
      target,
      point: { x: 100, y: 100 },
      data: cardData(),
      registry: cardRegistry(),
    });

    expect(indicator).toMatchObject({
      kind: "container",
      elementId: "card",
      path: ["body"],
      index: 0,
      activeLabel: "Card › body",
    });
    expect(indicator?.kind === "container" && indicator.tiling.kind).toBe(
      "tiled",
    );
  });

  test("multi-slot container: point past the last child's center → end index", () => {
    const source = bag({
      elementId: "h1",
      at: "slot",
      parentId: "card",
      path: ["header"],
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "card",
      at: "root",
      index: 1,
      role: "container",
    });
    const indicator = resolve({
      source,
      target,
      point: { x: 170, y: 220 },
      data: cardData(),
      registry: cardRegistry(),
    });

    expect(indicator).toMatchObject({ path: ["body"], index: 2 });
  });

  test("previous indicator's slot is sticky near its tile boundary", () => {
    // Source is b2 (in card body, index 1): drop into header or body at index 0
    // is not a same-slot no-op (0 ≠ 1), and the guard never fires because
    // source.parentId="card" ≠ target.parentId=null.
    const source = bag({
      elementId: "b2",
      at: "slot",
      parentId: "card",
      path: ["body"],
      index: 1,
      role: "sibling",
    });
    const target = bag({
      elementId: "card",
      at: "root",
      index: 1,
      role: "container",
    });
    // header tile spans [0..55]; just past the boundary at y=58 is the body
    // tile, but header's 8px-expanded rect still covers it when it was current.
    const point = { x: 100, y: 58 };
    const args = {
      source,
      target,
      point,
      data: cardData(),
      registry: cardRegistry(),
    };

    expect(resolve(args)).toMatchObject({ path: ["body"] });
    // Sticky: header is held even though the point sits in the body band. The
    // header slot has one wide child (h1, 180×40 → horizontal before/after axis),
    // so its insert index flips at the child's x-midpoint (100); point.x=100 is
    // not strictly past it → insert before → index 0.
    expect(
      resolve({ ...args, previous: containerTarget("header", 1) }),
    ).toMatchObject({ path: ["header"], index: 0 });
  });

  test("pointer over an empty slot's carved band → that slot at append index", () => {
    const source = bag({
      elementId: "h1",
      at: "slot",
      parentId: "card",
      path: ["header"],
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "card",
      at: "root",
      index: 1,
      role: "container",
    });
    const indicator = resolve({
      source,
      target,
      point: { x: 100, y: 299 },
      data: cardData(),
      registry: cardRegistry(),
    });

    expect(indicator).toMatchObject({
      kind: "container",
      path: ["footer"],
      index: 0,
      activeLabel: "Card › footer",
    });
  });

  test("multi-slot container with no measurable slots → append into slots[0]", () => {
    // Source from card body: different slot from header, so drop into header
    // is not a no-op. emptyRegistry has no slot measurements → discrete fallback.
    const source = bag({
      elementId: "b1",
      at: "slot",
      parentId: "card",
      path: ["body"],
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "card",
      at: "root",
      index: 1,
      role: "container",
    });
    // source.parentId="card", target.parentId=null → different parent → no guard.
    expect(
      resolve({ source, target, data: cardData(), registry: emptyRegistry }),
    ).toMatchObject({
      kind: "container",
      elementId: "card",
      path: ["header"],
      index: 1, // header has h1, append at end = 1
    });
  });

  test("container target unknown in data → explicit no-target", () => {
    // source inside a known container so same-parent guard won't misfire
    const source = bag({
      elementId: "d",
      at: "slot",
      parentId: "box",
      path: ["items"],
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "gone",
      at: "root",
      index: 9,
      role: "container",
    });
    expect(resolve({ source, target })).toEqual({
      kind: "none",
      elementId: "gone",
    });
  });

  test("returns null when edge is null (no atlaskit symbol)", () => {
    const target = bag({
      elementId: "d",
      at: "slot",
      parentId: "box",
      path: ["items"],
      index: 0,
      role: "sibling",
    });
    const registry = stubRegistry({
      d: new DOMRect(0, 0, 100, 50),
      e: new DOMRect(0, 60, 100, 50),
    });
    expect(resolve({ target, registry })).toBeNull();
  });

  test("same-slot with null edge returns null", () => {
    const registry = stubRegistry({
      a: new DOMRect(0, 0, 100, 50),
      b: new DOMRect(0, 60, 100, 50),
    });
    const target = bag({
      elementId: "b",
      at: "root",
      index: 1,
      role: "sibling",
    });
    expect(resolve({ target, registry })).toBeNull();
  });
});

// --- Same-parent container guard ---

// Three cards in a horizontal grid.
// card1(idx=0): (0,0,180,90)
// card2(idx=1): (200,0,180,90)   ← target for "left/right" edge tests
// card3(idx=2): (400,0,180,90)   ← source for non-no-op edge tests
// detectAxis on card1+card2: dy=0, dx=200 → horizontal axis
const gridData = (): Data => ({
  root: { props: {} },
  content: [
    {
      type: "Grid",
      props: {
        id: "grid",
        items: [
          {
            type: "Card",
            props: { id: "card1", header: [], body: [], footer: [] },
          },
          {
            type: "Card",
            props: {
              id: "card2",
              header: [{ type: "Text", props: { id: "t1", text: "hi" } }],
              body: [],
              footer: [],
            },
          },
          {
            type: "Card",
            props: { id: "card3", header: [], body: [], footer: [] },
          },
        ],
      },
    },
  ],
});

const gridRegistry = () =>
  stubRegistry({
    grid: new DOMRect(0, 0, 600, 90),
    card1: new DOMRect(0, 0, 180, 90),
    card2: new DOMRect(200, 0, 180, 90),
    card3: new DOMRect(400, 0, 180, 90),
    t1: new DOMRect(210, 10, 160, 40),
  });

describe("resolveIndicator — same-parent container guard", () => {
  /** card3 (index 2) as source; card2 (index 1) as target — same parent "grid".
   *  Inserting before card2 (left edge, index 1) adjusted for card3 removal:
   *  1 <= 2 → stays 1; 1 ≠ 2 → not a no-op. */
  const sourceCard3 = () =>
    bag({
      elementId: "card3",
      at: "slot",
      parentId: "grid",
      path: ["items"],
      index: 2,
      role: "sibling",
    });

  const targetCard2Container = () =>
    bag({
      elementId: "card2",
      at: "slot",
      parentId: "grid",
      path: ["items"],
      index: 1,
      role: "container",
    });

  test("sibling container with same parent resolves to line, not interiors", () => {
    const result = resolve({
      source: sourceCard3(),
      target: targetCard2Container(),
      point: { x: 270, y: 40 },
      data: gridData(),
      registry: gridRegistry(),
    });

    expect(result?.kind).toBe("line");
    expect(result?.kind === "line" && result.elementId).toBe("card2");
  });

  test("same-parent container: pointer on left half → left edge (horizontal axis)", () => {
    // card2 rect: x=200, width=180, midpoint x=290.
    // point x=270 < 290 → left edge (before card2).
    const result = resolve({
      source: sourceCard3(),
      target: targetCard2Container(),
      point: { x: 270, y: 40 },
      data: gridData(),
      registry: gridRegistry(),
    });

    expect(result).toMatchObject({
      kind: "line",
      elementId: "card2",
      edge: "left",
      axis: "horizontal",
    });
  });

  test("same-parent container: pointer on right half → right edge (horizontal axis)", () => {
    // point x=310 ≥ midpoint 290 → right edge (after card2).
    // Inserting after card2 (index 2), adjusted for card3 removal (index 2): 2 === 2 → null (no-op).
    // Use card1 as source to avoid the no-op on the right side as well.
    const sourceCard1 = bag({
      elementId: "card1",
      at: "slot",
      parentId: "grid",
      path: ["items"],
      index: 0,
      role: "sibling",
    });
    const result = resolve({
      source: sourceCard1,
      target: targetCard2Container(),
      point: { x: 310, y: 40 },
      data: gridData(),
      registry: gridRegistry(),
    });

    expect(result).toMatchObject({
      kind: "line",
      elementId: "card2",
      edge: "right",
      axis: "horizontal",
    });
  });

  test("same-parent container: no-op when resolved insert equals source index → null", () => {
    // card1 (index 0) dragged before card2 (index 1): left edge → insert at 1,
    // adjusted for card1 removal: 1>0 → 0 == source.index=0 → no-op.
    const sourceCard1 = bag({
      elementId: "card1",
      at: "slot",
      parentId: "grid",
      path: ["items"],
      index: 0,
      role: "sibling",
    });
    const result = resolve({
      source: sourceCard1,
      target: targetCard2Container(),
      point: { x: 270, y: 40 },
      data: gridData(),
      registry: gridRegistry(),
    });

    expect(result).toBeNull();
  });

  test("different-parent container still resolves interiors (not same-parent guard)", () => {
    // source in root content (null/null), card2 in grid.items → different parent
    const sourceInRoot = bag({
      elementId: "a",
      at: "root",
      index: 0,
      role: "sibling",
    });

    const result = resolve({
      source: sourceInRoot,
      target: targetCard2Container(),
      point: { x: 270, y: 40 },
      data: gridData(),
      registry: gridRegistry(),
    });

    expect(result?.kind).toBe("container");
  });
});
