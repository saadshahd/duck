import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import type { FiberRegistry } from "../fiber/index.js";
import { resolveIndicator } from "./resolve-indicator.js";
import type { DragData } from "./helpers.js";

// --- Factories ---

const text = (id: string): ComponentData => ({
  type: "Text",
  props: { id, text: id },
});

const box = (id: string, items: ComponentData[]): ComponentData => ({
  type: "Box",
  props: { id, items },
});

const data = (): Data => ({
  root: { props: {} },
  content: [
    text("a"),
    text("b"),
    text("c"),
    box("box", [text("d"), text("e")]),
  ],
});

const bag = (d: DragData) => ({
  data: d as unknown as Record<string | symbol, unknown>,
});

const stubRegistry = (rects: Record<string, DOMRect>): FiberRegistry => ({
  get: (id) => {
    const r = rects[id];
    return r ? ({ getBoundingClientRect: () => r } as HTMLElement) : undefined;
  },
  getNodeId: () => undefined,
  dispose: () => {},
});

const emptyRegistry = stubRegistry({});

// --- Tests ---

describe("resolveIndicator", () => {
  test("returns null when target is undefined", () => {
    const source = bag({
      elementId: "a",
      parentId: null,
      slotKey: null,
      index: 0,
      role: "sibling",
    });
    expect(
      resolveIndicator(source, undefined, data(), emptyRegistry, new Set()),
    ).toBeNull();
  });

  test("returns null for self-drop", () => {
    const source = bag({
      elementId: "a",
      parentId: null,
      slotKey: null,
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "a",
      parentId: null,
      slotKey: null,
      index: 0,
      role: "sibling",
    });
    expect(
      resolveIndicator(source, target, data(), emptyRegistry, new Set()),
    ).toBeNull();
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
      resolveIndicator(
        source,
        target,
        data(),
        emptyRegistry,
        new Set(["d", "e"]),
      ),
    ).toBeNull();
  });

  test("container target returns container indicator", () => {
    const source = bag({
      elementId: "a",
      parentId: null,
      slotKey: null,
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "box",
      parentId: null,
      slotKey: null,
      index: 3,
      role: "container",
      containerSlotKey: "items",
    });
    expect(
      resolveIndicator(source, target, data(), emptyRegistry, new Set()),
    ).toEqual({
      kind: "container",
      elementId: "box",
    });
  });

  test("returns null when edge is null (no atlaskit symbol)", () => {
    const source = bag({
      elementId: "a",
      parentId: null,
      slotKey: null,
      index: 0,
      role: "sibling",
    });
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
    expect(
      resolveIndicator(source, target, data(), registry, new Set()),
    ).toBeNull();
  });

  test("same-slot with null edge returns null", () => {
    const registry = stubRegistry({
      a: new DOMRect(0, 0, 100, 50),
      b: new DOMRect(0, 60, 100, 50),
    });
    const source = bag({
      elementId: "a",
      parentId: null,
      slotKey: null,
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "b",
      parentId: null,
      slotKey: null,
      index: 1,
      role: "sibling",
    });
    expect(
      resolveIndicator(source, target, data(), registry, new Set()),
    ).toBeNull();
  });
});
