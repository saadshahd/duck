import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { getChildrenAt } from "./get-children-at.js";

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
      items: [make("Heading", "h1"), make("Text", "t1")],
      title: "not a slot",
    }),
    make("Footer", "footer"),
  ],
};

describe("getChildrenAt", () => {
  it("returns data.content for top-level (null, null)", () => {
    const children = getChildrenAt(data, null, null);
    expect(children).toBe(data.content);
  });

  it("returns slot array for known parent + slot", () => {
    const children = getChildrenAt(data, "stack", "items")!;
    expect(children.map((c) => c.props.id)).toEqual(["h1", "t1"]);
  });

  it("returns null for unknown parentId", () => {
    expect(getChildrenAt(data, "nope", "items")).toBeNull();
  });

  it("returns null when slotKey is not a slot field", () => {
    expect(getChildrenAt(data, "stack", "title")).toBeNull();
  });

  it("returns null when only one of parentId/slotKey is null", () => {
    expect(getChildrenAt(data, "stack", null)).toBeNull();
    expect(getChildrenAt(data, null, "items")).toBeNull();
  });
});
