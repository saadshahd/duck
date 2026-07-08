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
    expect(findParent(data, "stack")).toEqual({ at: "root", index: 0 });
  });

  it("returns top-level position for second content entry", () => {
    expect(findParent(data, "footer")).toEqual({ at: "root", index: 1 });
  });

  it("returns parent + slot + index for nested child", () => {
    expect(findParent(data, "heading")).toEqual({
      at: "slot",
      parentId: "stack",
      path: ["items"],
      index: 0,
    });
  });

  it("returns parent for sibling at later index", () => {
    expect(findParent(data, "card")).toEqual({
      at: "slot",
      parentId: "stack",
      path: ["items"],
      index: 1,
    });
  });

  it("returns parent for deeply nested child", () => {
    expect(findParent(data, "body")).toEqual({
      at: "slot",
      parentId: "card",
      path: ["body"],
      index: 0,
    });
  });

  it("returns the array-item slot site for a child in an array-item slot", () => {
    const sections: Data = {
      root: { props: {} },
      content: [
        make("Sections", "sections", {
          items: [
            { heading: "a", content: [make("Text", "a-text")] },
            { heading: "b", content: [make("Text", "b-text")] },
          ],
        }),
      ],
    };
    expect(findParent(sections, "b-text")).toEqual({
      at: "slot",
      parentId: "sections",
      path: ["items", 1, "content"],
      index: 0,
    });
  });

  it("returns null for unknown id", () => {
    expect(findParent(data, "nope")).toBeNull();
  });
});
