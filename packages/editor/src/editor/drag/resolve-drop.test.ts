import { describe, test, expect } from "bun:test";
import type { Data } from "@puckeditor/core";
import { findById } from "@duckeditor/spec";
import { resolveDrop } from "./resolve-drop.js";
import type { DropTarget } from "../layout/index.js";
import {
  text,
  box,
  bag,
  stubRegistry,
  emptyRegistry,
} from "./drag-test-fixtures.js";

const containerIndicator = (
  elementId: string,
  slotKey: string,
  index: number,
): DropTarget => ({
  kind: "container",
  elementId,
  slotKey,
  index,
  tiling: { kind: "discrete", slotKeys: [slotKey] },
  activeLabel: slotKey,
});

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

const sourceA = () =>
  bag({
    elementId: "a",
    parentId: null,
    slotKey: null,
    index: 0,
    role: "sibling",
  });

const resolve = (overrides: Partial<Parameters<typeof resolveDrop>[0]>) =>
  resolveDrop({
    source: sourceA(),
    target: undefined,
    indicator: null,
    data: data(),
    registry: emptyRegistry,
    descendantSet: new Set(),
    ...overrides,
  });

// --- Tests ---

describe("resolveDrop", () => {
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

  test("container drop commits the indicator's slot and index verbatim", () => {
    const target = bag({
      elementId: "box",
      parentId: null,
      slotKey: null,
      index: 3,
      role: "container",
    });
    const result = resolve({
      target,
      indicator: containerIndicator("box", "items", 0),
    });

    expect(result?.event).toEqual({
      type: "DROP",
      sourceParentId: null,
      targetParentId: "box",
      fromIndex: 0,
      toIndex: 0,
    });
    const moved = result!.newData._unsafeUnwrap();
    expect(
      (findById(moved, "box")!.props.items as { props: { id: string } }[]).map(
        (c) => c.props.id,
      ),
    ).toEqual(["a", "d", "e"]);
  });

  test("container drop into an empty slot commits index 0", () => {
    const target = bag({
      elementId: "empty",
      parentId: null,
      slotKey: null,
      index: 4,
      role: "container",
    });
    const result = resolve({
      target,
      indicator: containerIndicator("empty", "items", 0),
    });

    expect(result?.event).toMatchObject({
      targetParentId: "empty",
      toIndex: 0,
    });
    expect(result!.newData.isOk()).toBe(true);
  });

  test("container indicator commits even when the drop lands on a sibling", () => {
    const target = bag({
      elementId: "d",
      parentId: "box",
      slotKey: "items",
      index: 0,
      role: "sibling",
    });
    const result = resolve({
      target,
      indicator: containerIndicator("empty", "items", 0),
    });

    expect(result?.event).toMatchObject({
      targetParentId: "empty",
      toIndex: 0,
    });
    expect(result!.newData.isOk()).toBe(true);
  });

  test("drop without an indicator → null (never recomputed)", () => {
    const target = bag({
      elementId: "box",
      parentId: null,
      slotKey: null,
      index: 3,
      role: "container",
    });
    expect(resolve({ target, indicator: null })).toBeNull();
  });

  test("no-target indicator → null", () => {
    const target = bag({
      elementId: "box",
      parentId: null,
      slotKey: null,
      index: 3,
      role: "container",
    });
    expect(
      resolve({ target, indicator: { kind: "none", elementId: "box" } }),
    ).toBeNull();
  });

  test("cross-slot sibling drop with null edge uses target index", () => {
    const target = bag({
      elementId: "d",
      parentId: "box",
      slotKey: "items",
      index: 1,
      role: "sibling",
    });
    const result = resolve({
      target,
      indicator: {
        kind: "line",
        elementId: "d",
        edge: "top",
        axis: "vertical",
      },
    });

    expect(result?.event).toEqual({
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
    const target = bag({
      elementId: "b",
      parentId: null,
      slotKey: null,
      index: 1,
      role: "sibling",
    });
    const result = resolve({
      target,
      registry,
      indicator: {
        kind: "line",
        elementId: "b",
        edge: "bottom",
        axis: "vertical",
      },
    });

    expect(result?.event).toMatchObject({
      sourceParentId: null,
      targetParentId: null,
    });
  });
});
