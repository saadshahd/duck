import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { findParent } from "./find-parent.js";

const make = (
  type: string,
  id: string,
  extra: Record<string, unknown> = {},
): ComponentData =>
  ({ type, props: { id, ...extra } }) as unknown as ComponentData;

const data: Data = {
  root: { props: {} },
  content: [
    make("Stack", "stack", {
      items: [
        make("Heading", "heading"),
        make("Card", "card", { body: [make("Text", "body")] }),
      ],
    }),
    make("Footer", "footer"),
  ],
};

describe("findParent", () => {
  it("returns top-level position for first content entry", () => {
    expect(findParent(data, "stack")).toEqual({
      parentId: null,
      slotKey: null,
      index: 0,
    });
  });

  it("returns top-level position for second content entry", () => {
    expect(findParent(data, "footer")).toEqual({
      parentId: null,
      slotKey: null,
      index: 1,
    });
  });

  it("returns parent + slot + index for nested child", () => {
    expect(findParent(data, "heading")).toEqual({
      parentId: "stack",
      slotKey: "items",
      index: 0,
    });
  });

  it("returns parent for sibling at later index", () => {
    expect(findParent(data, "card")).toEqual({
      parentId: "stack",
      slotKey: "items",
      index: 1,
    });
  });

  it("returns parent for deeply nested child", () => {
    expect(findParent(data, "body")).toEqual({
      parentId: "card",
      slotKey: "body",
      index: 0,
    });
  });

  it("returns null for unknown id", () => {
    expect(findParent(data, "nope")).toBeNull();
  });
});
