import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { resolveIndicator } from "./resolve-indicator.js";
import { chipLayout } from "./slot-chips.js";
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

const xywh = (r?: DOMRect) => r && { x: r.x, y: r.y, w: r.width, h: r.height };

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

  test("single populated slot → append at end of slots[0]", () => {
    const target = bag({
      elementId: "box",
      parentId: null,
      slotKey: null,
      index: 3,
      role: "container",
    });
    expect(resolve({ target })).toEqual({
      kind: "container",
      elementId: "box",
      slotKey: "items",
      index: 2,
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

  test("multi-slot container: point resolves slot, index, and region", () => {
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

    expect(
      indicator?.kind === "container" && {
        ...indicator,
        region: xywh(indicator.region),
      },
    ).toEqual({
      kind: "container",
      elementId: "card",
      slotKey: "body",
      index: 0,
      region: { x: 10, y: 60, w: 180, h: 170 },
    });
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

  test("previous indicator's slot is sticky near its boundary", () => {
    const target = bag({
      elementId: "card",
      parentId: null,
      slotKey: null,
      index: 1,
      role: "container",
    });
    const point = { x: 100, y: 57 };
    const args = { target, point, data: cardData(), registry: cardRegistry() };

    expect(resolve(args)).toMatchObject({ slotKey: "body" });
    expect(
      resolve({
        ...args,
        previous: {
          kind: "container",
          elementId: "card",
          slotKey: "header",
          index: 1,
        },
      }),
    ).toMatchObject({ slotKey: "header", index: 1 });
  });

  // card rect (0,0,200,300) → footer chip laid at (44,214,96,22) by chipLayout
  const footerChipCenter = () => {
    const [chip] = chipLayout({
      containerRect: new DOMRect(0, 0, 200, 300),
      specs: [{ slotKey: "footer", index: 0 }],
    });
    return {
      x: chip.rect.left + chip.rect.width / 2,
      y: chip.rect.top + chip.rect.height / 2,
    };
  };

  test("pointer inside a chip rect wins over slot regions", () => {
    const target = bag({
      elementId: "card",
      parentId: null,
      slotKey: null,
      index: 1,
      role: "container",
    });
    expect(
      resolve({
        target,
        point: footerChipCenter(),
        data: cardData(),
        registry: cardRegistry(),
      }),
    ).toEqual({
      kind: "container",
      elementId: "card",
      slotKey: "footer",
      index: 0,
    });
  });

  test("chip hit holds when the pointer is over a sibling beneath the chip", () => {
    const target = bag({
      elementId: "b2",
      parentId: "card",
      slotKey: "body",
      index: 1,
      role: "sibling",
    });
    expect(
      resolve({
        target,
        point: footerChipCenter(),
        previous: {
          kind: "container",
          elementId: "card",
          slotKey: "body",
          index: 1,
        },
        data: cardData(),
        registry: cardRegistry(),
      }),
    ).toEqual({
      kind: "container",
      elementId: "card",
      slotKey: "footer",
      index: 0,
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
    expect(resolve({ target, data: cardData() })).toEqual({
      kind: "container",
      elementId: "card",
      slotKey: "header",
      index: 1,
    });
  });

  test("container target unknown in data → null", () => {
    const target = bag({
      elementId: "gone",
      parentId: null,
      slotKey: null,
      index: 9,
      role: "container",
    });
    expect(resolve({ target })).toBeNull();
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
