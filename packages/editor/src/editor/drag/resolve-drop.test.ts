import { describe, test, expect } from "bun:test";
import type { Data } from "@puckeditor/core";
import { resolveDrop } from "./resolve-drop.js";
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
    box("empty", []),
  ],
});

// --- Tests ---

describe("resolveDrop", () => {
  test("returns null when target is undefined", () => {
    const source = bag({
      elementId: "a",
      parentId: null,
      slotKey: null,
      index: 0,
      role: "sibling",
    });
    expect(
      resolveDrop(source, undefined, data(), emptyRegistry, new Set()),
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
      resolveDrop(source, target, data(), emptyRegistry, new Set()),
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
      resolveDrop(source, target, data(), emptyRegistry, new Set(["d", "e"])),
    ).toBeNull();
  });

  test("container drop appends at end of target slot", () => {
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
    const result = resolveDrop(
      source,
      target,
      data(),
      emptyRegistry,
      new Set(),
    );

    expect(result).not.toBeNull();
    expect(result!.event).toEqual({
      type: "DROP",
      sourceParentId: null,
      targetParentId: "box",
      fromIndex: 0,
      toIndex: 2,
    });
    expect(result!.newData.isOk()).toBe(true);
  });

  test("container drop into empty target uses toIndex 0", () => {
    const source = bag({
      elementId: "a",
      parentId: null,
      slotKey: null,
      index: 0,
      role: "sibling",
    });
    const target = bag({
      elementId: "empty",
      parentId: null,
      slotKey: null,
      index: 4,
      role: "container",
      containerSlotKey: "items",
    });
    const result = resolveDrop(
      source,
      target,
      data(),
      emptyRegistry,
      new Set(),
    );

    expect(result).not.toBeNull();
    if (result!.event.type !== "DROP") throw new Error("expected DROP");
    expect(result!.event.toIndex).toBe(0);
  });

  test("cross-slot sibling drop with null edge uses target index", () => {
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
      index: 1,
      role: "sibling",
    });
    const result = resolveDrop(
      source,
      target,
      data(),
      emptyRegistry,
      new Set(),
    );

    expect(result).not.toBeNull();
    expect(result!.event).toEqual({
      type: "DROP",
      sourceParentId: null,
      targetParentId: "box",
      fromIndex: 0,
      toIndex: 1,
    });
    expect(result!.newData.isOk()).toBe(true);
  });

  test("same-slot reorder produces correct event", () => {
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
    const result = resolveDrop(source, target, data(), registry, new Set());

    expect(result).not.toBeNull();
    if (result!.event.type !== "DROP") throw new Error("expected DROP");
    expect(result!.event.sourceParentId).toBe(null);
    expect(result!.event.targetParentId).toBe(null);
  });
});
