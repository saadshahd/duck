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
    parentId: null,
    slotKey: null,
    index: 0,
    role: "sibling",
  });

const containerTarget = (slotKey: string, index: number): DropTarget => ({
  kind: "container",
  elementId: "card",
  slotKey,
  index,
  tiling: { kind: "discrete", slotKeys: [slotKey] },
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
      parentId: null,
      slotKey: null,
      index: 3,
      role: "sibling",
    });
    const target = bag({
      elementId: "d",
      parentId: "box",
      slotKey: "items",
      index: 0,
      role: "sibling",
    });
    expect(
      resolve({ source, target, descendantSet: new Set(["d", "e"]) }),
    ).toBeNull();
  });

  test("single-slot container with no measurable geometry → append into slots[0]", () => {
    const target = bag({
      elementId: "box",
      parentId: null,
      slotKey: null,
      index: 3,
      role: "container",
    });
    expect(resolve({ target })).toMatchObject({
      kind: "container",
      elementId: "box",
      slotKey: "items",
      index: 2,
      activeLabel: "Box › items",
    });
  });

  test("append into the source's own slot when already last → null (no-op)", () => {
    const source = bag({
      elementId: "e",
      parentId: "box",
      slotKey: "items",
      index: 1,
      role: "sibling",
    });
    const target = bag({
      elementId: "box",
      parentId: null,
      slotKey: null,
      index: 3,
      role: "container",
    });
    expect(resolve({ source, target })).toBeNull();
  });

  test("multi-slot container: pointer resolves slot, index, and carries a tiling", () => {
    const target = bag({
      elementId: "card",
      parentId: null,
      slotKey: null,
      index: 1,
      role: "container",
    });
    const indicator = resolve({
      target,
      point: { x: 100, y: 100 },
      data: cardData(),
      registry: cardRegistry(),
    });

    expect(indicator).toMatchObject({
      kind: "container",
      elementId: "card",
      slotKey: "body",
      index: 0,
      activeLabel: "Card › body",
    });
    expect(indicator?.kind === "container" && indicator.tiling.kind).toBe(
      "tiled",
    );
  });

  test("multi-slot container: point past the last child's center → end index", () => {
    const target = bag({
      elementId: "card",
      parentId: null,
      slotKey: null,
      index: 1,
      role: "container",
    });
    const indicator = resolve({
      target,
      point: { x: 170, y: 220 },
      data: cardData(),
      registry: cardRegistry(),
    });

    expect(indicator).toMatchObject({ slotKey: "body", index: 2 });
  });

  test("previous indicator's slot is sticky near its tile boundary", () => {
    const target = bag({
      elementId: "card",
      parentId: null,
      slotKey: null,
      index: 1,
      role: "container",
    });
    // header tile spans [0..55]; just past the boundary at y=58 is the body
    // tile, but header's 8px-expanded rect still covers it when it was current.
    const point = { x: 100, y: 58 };
    const args = { target, point, data: cardData(), registry: cardRegistry() };

    expect(resolve(args)).toMatchObject({ slotKey: "body" });
    expect(
      resolve({ ...args, previous: containerTarget("header", 1) }),
    ).toMatchObject({ slotKey: "header", index: 1 });
  });

  test("pointer over an empty slot's carved band → that slot at append index", () => {
    const target = bag({
      elementId: "card",
      parentId: null,
      slotKey: null,
      index: 1,
      role: "container",
    });
    const indicator = resolve({
      target,
      point: { x: 100, y: 299 },
      data: cardData(),
      registry: cardRegistry(),
    });

    expect(indicator).toMatchObject({
      kind: "container",
      slotKey: "footer",
      index: 0,
      activeLabel: "Card › footer",
    });
  });

  test("multi-slot container with no measurable slots → append into slots[0]", () => {
    const target = bag({
      elementId: "card",
      parentId: null,
      slotKey: null,
      index: 1,
      role: "container",
    });
    expect(
      resolve({ target, data: cardData(), registry: emptyRegistry }),
    ).toMatchObject({
      kind: "container",
      elementId: "card",
      slotKey: "header",
      index: 1,
    });
  });

  test("container target unknown in data → explicit no-target", () => {
    const target = bag({
      elementId: "gone",
      parentId: null,
      slotKey: null,
      index: 9,
      role: "container",
    });
    expect(resolve({ target })).toEqual({ kind: "none", elementId: "gone" });
  });

  test("returns null when edge is null (no atlaskit symbol)", () => {
    const target = bag({
      elementId: "d",
      parentId: "box",
      slotKey: "items",
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
      parentId: null,
      slotKey: null,
      index: 1,
      role: "sibling",
    });
    expect(resolve({ target, registry })).toBeNull();
  });
});
