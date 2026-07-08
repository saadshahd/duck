import { describe, test, expect } from "bun:test";
import type { Data } from "@puckeditor/core";
import { findById } from "@duckeditor/spec";
import { resolveDrop } from "./resolve-drop.js";
import type { DropTarget } from "../layout/index.js";
import { text, box, bag } from "./drag-test-fixtures.js";

const containerIndicator = (
  elementId: string,
  slotKey: string,
  index: number,
): DropTarget => ({
  kind: "container",
  elementId,
  path: [slotKey],
  index,
  tiling: { kind: "discrete", slots: [{ path: [slotKey] }] },
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
    at: "root",
    index: 0,
    role: "sibling",
  });

const resolve = (overrides: Partial<Parameters<typeof resolveDrop>[0]>) =>
  resolveDrop({
    source: sourceA(),
    target: undefined,
    indicator: null,
    data: data(),
    descendantSet: new Set(),
    ...overrides,
  });

// --- Tests ---

describe("resolveDrop", () => {
  test("returns null when both target and indicator are absent", () => {
    expect(resolve({})).toBeNull();
  });

  test("container indicator commits when target is absent (cleared at drop)", () => {
    // A real OS drag clears dropTargets via a dragleave before drop; the held
    // container indicator must still commit verbatim with no target bag.
    const result = resolve({
      target: undefined,
      indicator: containerIndicator("box", "items", 0),
    });

    expect(result?.event).toEqual({
      type: "DROP",
      sourceParentId: null,
      targetParentId: "box",
      fromIndex: 0,
      toIndex: 0,
    });
    expect(
      (
        findById(result!.newData._unsafeUnwrap(), "box")!.props.items as {
          props: { id: string };
        }[]
      ).map((c) => c.props.id),
    ).toEqual(["a", "d", "e"]);
  });

  test("line indicator commits when target is absent (cleared at drop)", () => {
    const result = resolve({
      target: undefined,
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
      toIndex: 0,
    });
    expect(result!.newData.isOk()).toBe(true);
  });

  test("no-target indicator with absent target → null", () => {
    expect(
      resolve({
        target: undefined,
        indicator: { kind: "none", elementId: "box" },
      }),
    ).toBeNull();
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

  test("container drop commits the indicator's slot and index verbatim", () => {
    const target = bag({
      elementId: "box",
      at: "root",
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
      at: "root",
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
      at: "slot",
      parentId: "box",
      path: ["items"],
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
      at: "root",
      index: 3,
      role: "container",
    });
    expect(resolve({ target, indicator: null })).toBeNull();
  });

  test("no-target indicator → null", () => {
    const target = bag({
      elementId: "box",
      at: "root",
      index: 3,
      role: "container",
    });
    expect(
      resolve({ target, indicator: { kind: "none", elementId: "box" } }),
    ).toBeNull();
  });

  test("line indicator commits from indicator elementId + edge, ignoring target bag", () => {
    // d is at index 0 in box.items; top edge → insert before d at index 0.
    const target = bag({
      elementId: "d",
      at: "slot",
      parentId: "box",
      path: ["items"],
      index: 0,
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
      toIndex: 0,
    });
    expect(result!.newData.isOk()).toBe(true);
  });

  test("same-slot reorder: source a onto b's bottom edge lands removal-adjusted", () => {
    // Root content [a, b, c, box, empty]; a (index 0) onto b's (index 1) bottom
    // edge. getReorderDestinationIndex accounts for a's removal → index 1 →
    // [b, a, c, box, empty]. Without the adjustment it would land at index 2.
    const target = bag({
      elementId: "b",
      at: "root",
      index: 1,
      role: "sibling",
    });
    const result = resolve({
      target,
      indicator: {
        kind: "line",
        elementId: "b",
        edge: "bottom",
        axis: "vertical",
      },
    });

    expect(result?.event).toMatchObject({
      type: "DROP",
      sourceParentId: null,
      targetParentId: null,
      fromIndex: 0,
      toIndex: 1,
    });
    const moved = result!.newData._unsafeUnwrap();
    expect(moved.content.map((c) => c.props.id)).toEqual([
      "b",
      "a",
      "c",
      "box",
      "empty",
    ]);
  });

  test("same-parent container guard: source before sibling container, bottom edge", () => {
    // Root content [a, b, c, box, empty]; a (index 0) dropped onto the box
    // CONTAINER's bottom edge (same-parent guard line). box is at index 3 in
    // root content. getReorderDestinationIndex accounts for a's removal →
    // index 3 → [b, c, box, a, empty].
    const target = bag({
      elementId: "box",
      at: "root",
      index: 3,
      role: "container",
    });
    const result = resolve({
      target,
      indicator: {
        kind: "line",
        elementId: "box",
        edge: "bottom",
        axis: "vertical",
      },
    });

    expect(result?.event).toMatchObject({
      type: "DROP",
      sourceParentId: null,
      targetParentId: null,
      fromIndex: 0,
      toIndex: 3,
    });
    const moved = result!.newData._unsafeUnwrap();
    expect(moved.content.map((c) => c.props.id)).toEqual([
      "b",
      "c",
      "box",
      "a",
      "empty",
    ]);
  });
});
