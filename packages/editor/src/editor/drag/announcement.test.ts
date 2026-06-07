import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { announcementFor } from "./announcement.js";
import type { DropTarget } from "../layout/index.js";

const leaf = (id: string, type = "Text"): ComponentData => ({
  type,
  props: { id },
});

const stack = (id: string, items: ComponentData[]): ComponentData => ({
  type: "Stack",
  props: { id, items },
});

const stackData = (children: ComponentData[]): Data => ({
  root: { props: {} },
  content: [stack("container", children)],
});

const containerTarget = (
  elementId: string,
  slotKey: string,
  index: number,
): DropTarget => ({
  kind: "container",
  elementId,
  slotKey,
  index,
  tiling: { kind: "discrete", slots: [{ slotKey }] },
  activeLabel: slotKey,
});

describe("announcementFor", () => {
  test("container target → qualified label only", () => {
    expect(
      announcementFor(
        stackData([leaf("a")]),
        containerTarget("container", "items", 1),
      ),
    ).toBe("Stack › items");
  });

  test("line target → label, position, and sibling type", () => {
    const target: DropTarget = {
      kind: "line",
      elementId: "b",
      edge: "bottom",
      axis: "vertical",
    };
    expect(announcementFor(stackData([leaf("a"), leaf("b")]), target)).toBe(
      "Stack › items — after Text",
    );
  });

  test("line target top edge → before", () => {
    const target: DropTarget = {
      kind: "line",
      elementId: "b",
      edge: "top",
      axis: "vertical",
    };
    expect(announcementFor(stackData([leaf("a"), leaf("b")]), target)).toBe(
      "Stack › items — before Text",
    );
  });

  test("orphan line target → empty string (no label)", () => {
    const target: DropTarget = {
      kind: "line",
      elementId: "orphan",
      edge: "top",
      axis: "vertical",
    };
    expect(announcementFor(stackData([leaf("a")]), target)).toBe("");
  });

  test("root target → label only", () => {
    const target: DropTarget = { kind: "root", index: 0, label: "Root" };
    expect(announcementFor(stackData([leaf("a")]), target)).toBe("Root");
  });

  test("line target with empty sibling type → label only, no trailing space", () => {
    const target: DropTarget = {
      kind: "line",
      elementId: "b",
      edge: "bottom",
      axis: "vertical",
    };
    expect(announcementFor(stackData([leaf("a"), leaf("b", "")]), target)).toBe(
      "Stack › items",
    );
  });
});
