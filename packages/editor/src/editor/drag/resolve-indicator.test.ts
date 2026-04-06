import { describe, test, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import type { FiberRegistry } from "../fiber/index.js";
import { resolveIndicator } from "./resolve-indicator.js";
import type { DragData } from "./helpers.js";

// --- Factories ---

const spec = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["a", "b", "c"] },
    a: { type: "Text", props: { text: "A" } },
    b: { type: "Text", props: { text: "B" } },
    c: { type: "Text", props: { text: "C" } },
    box: { type: "Box", props: {}, children: ["d", "e"] },
    d: { type: "Text", props: { text: "D" } },
    e: { type: "Text", props: { text: "E" } },
  },
});

const bag = (data: DragData) => ({
  data: data as Record<string | symbol, unknown>,
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
      parentId: "page",
      index: 0,
      role: "sibling",
    });
    expect(
      resolveIndicator(source, undefined, spec(), emptyRegistry, new Set()),
    ).toBeNull();
  });

  test("returns null for self-drop", () => {
    const source = bag({
      elementId: "a",
      parentId: "page",
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "a",
      parentId: "page",
      index: 0,
      role: "sibling",
    });
    expect(
      resolveIndicator(source, target, spec(), emptyRegistry, new Set()),
    ).toBeNull();
  });

  test("returns null when target is a descendant", () => {
    const source = bag({
      elementId: "page",
      parentId: "page",
      index: 0,
      role: "container",
    });
    const target = bag({
      elementId: "b",
      parentId: "page",
      index: 1,
      role: "sibling",
    });
    expect(
      resolveIndicator(
        source,
        target,
        spec(),
        emptyRegistry,
        new Set(["a", "b", "c"]),
      ),
    ).toBeNull();
  });

  test("container target returns container indicator", () => {
    const source = bag({
      elementId: "a",
      parentId: "page",
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "box",
      parentId: "page",
      index: 0,
      role: "container",
    });
    expect(
      resolveIndicator(source, target, spec(), emptyRegistry, new Set()),
    ).toEqual({
      kind: "container",
      elementId: "box",
    });
  });

  test("returns null when edge is null (no atlaskit symbol)", () => {
    // Non-container cross-parent target without edge data → extractClosestEdge returns null → early return null
    const source = bag({
      elementId: "a",
      parentId: "page",
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "d",
      parentId: "box",
      index: 0,
      role: "sibling",
    });
    const registry = stubRegistry({
      d: new DOMRect(0, 0, 100, 50),
      e: new DOMRect(0, 60, 100, 50),
    });
    expect(
      resolveIndicator(source, target, spec(), registry, new Set()),
    ).toBeNull();
  });

  test("same-parent with null edge returns null", () => {
    // Without atlaskit edge symbol, extractClosestEdge returns null → early return null
    const registry = stubRegistry({
      a: new DOMRect(0, 0, 100, 50),
      b: new DOMRect(0, 60, 100, 50),
    });
    const source = bag({
      elementId: "a",
      parentId: "page",
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "b",
      parentId: "page",
      index: 1,
      role: "sibling",
    });
    expect(
      resolveIndicator(source, target, spec(), registry, new Set()),
    ).toBeNull();
  });
});
