import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { getChildrenAt, writableChildrenAt } from "./get-children-at.js";

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
  it("returns data.content for the root site", () => {
    const children = getChildrenAt(data, { at: "root" });
    expect(children).toBe(data.content);
  });

  it("returns slot array for known parent + slot", () => {
    const children = getChildrenAt(data, {
      at: "slot",
      parentId: "stack",
      slotKey: "items",
    })!;
    expect(children.map((c) => c.props.id)).toEqual(["h1", "t1"]);
  });

  it("returns null for unknown parentId", () => {
    expect(
      getChildrenAt(data, { at: "slot", parentId: "nope", slotKey: "items" }),
    ).toBeNull();
  });

  it("returns null when slotKey is not a slot field", () => {
    expect(
      getChildrenAt(data, { at: "slot", parentId: "stack", slotKey: "title" }),
    ).toBeNull();
  });
});

describe("writableChildrenAt", () => {
  it("returns a mutable reference into the draft", () => {
    const draft = structuredClone(data);
    const arr = writableChildrenAt(draft, {
      at: "slot",
      parentId: "stack",
      slotKey: "items",
    });
    expect(arr).not.toBeNull();
    arr!.push(make("Text", "new"));
    expect(draft.content[0]!.props.items).toHaveLength(3);
  });

  it("returns data.content for the root site", () => {
    const draft = structuredClone(data);
    expect(writableChildrenAt(draft, { at: "root" })).toBe(draft.content);
  });

  it("returns null for unknown parentId", () => {
    expect(
      writableChildrenAt(structuredClone(data), {
        at: "slot",
        parentId: "nope",
        slotKey: "items",
      }),
    ).toBeNull();
  });

  it("returns null when slot value isn't an array", () => {
    expect(
      writableChildrenAt(structuredClone(data), {
        at: "slot",
        parentId: "footer",
        slotKey: "items",
      }),
    ).toBeNull();
  });
});
