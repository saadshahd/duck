import { describe, test, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import type { FiberRegistry } from "../fiber/index.js";
import { resolveDrop } from "./resolve-drop.js";
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
    empty: { type: "Box", props: {}, children: [] },
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

describe("resolveDrop", () => {
  test("returns null when target is undefined", () => {
    const source = bag({
      elementId: "a",
      parentId: "page",
      index: 0,
      role: "sibling",
    });
    expect(
      resolveDrop(source, undefined, spec(), emptyRegistry, new Set()),
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
      resolveDrop(source, target, spec(), emptyRegistry, new Set()),
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
      elementId: "a",
      parentId: "page",
      index: 0,
      role: "sibling",
    });
    expect(
      resolveDrop(
        source,
        target,
        spec(),
        emptyRegistry,
        new Set(["a", "b", "c"]),
      ),
    ).toBeNull();
  });

  test("container drop appends at end of target children", () => {
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
    const result = resolveDrop(
      source,
      target,
      spec(),
      emptyRegistry,
      new Set(),
    );

    expect(result).not.toBeNull();
    expect(result!.event).toEqual({
      type: "DROP",
      sourceParentId: "page",
      targetParentId: "box",
      fromIndex: 0,
      toIndex: 2,
    });
    expect(result!.newSpec.isOk()).toBe(true);
  });

  test("container drop into empty target uses toIndex 0", () => {
    const source = bag({
      elementId: "a",
      parentId: "page",
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "empty",
      parentId: "page",
      index: 0,
      role: "container",
    });
    const result = resolveDrop(
      source,
      target,
      spec(),
      emptyRegistry,
      new Set(),
    );

    expect(result).not.toBeNull();
    expect(result!.event.toIndex).toBe(0);
  });

  test("cross-parent sibling drop with null edge uses target index", () => {
    // extractClosestEdge returns null without atlaskit symbol → resolveInsertIndex(1, null) → 1
    const source = bag({
      elementId: "a",
      parentId: "page",
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "d",
      parentId: "box",
      index: 1,
      role: "sibling",
    });
    const result = resolveDrop(
      source,
      target,
      spec(),
      emptyRegistry,
      new Set(),
    );

    expect(result).not.toBeNull();
    expect(result!.event).toEqual({
      type: "DROP",
      sourceParentId: "page",
      targetParentId: "box",
      fromIndex: 0,
      toIndex: 1,
    });
    expect(result!.newSpec.isOk()).toBe(true);
  });

  test("same-parent reorder produces correct event", () => {
    // Registry stubs so resolveParentAxis returns "vertical"
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
    // target has no atlaskit edge symbol, so closestEdgeOfTarget = null
    // getReorderDestinationIndex with null edge returns startIndex (no-op scenario)
    const target = bag({
      elementId: "b",
      parentId: "page",
      index: 1,
      role: "sibling",
    });
    const result = resolveDrop(source, target, spec(), registry, new Set());

    expect(result).not.toBeNull();
    expect(result!.event.type).toBe("DROP");
    expect(result!.event.sourceParentId).toBe("page");
    expect(result!.event.targetParentId).toBe("page");
  });
});
