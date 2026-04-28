import { describe, test, expect } from "bun:test";
import type { Data } from "@puckeditor/core";
import { resolveIndicator } from "./resolve-indicator.js";
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
