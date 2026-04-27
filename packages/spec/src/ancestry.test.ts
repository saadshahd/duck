import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { buildParentMap, getAncestry } from "./ancestry.js";

const make = (
  type: string,
  id: string,
  extra: Record<string, unknown> = {},
): ComponentData =>
  ({ type, props: { id, ...extra } }) as unknown as ComponentData;

const data: Data = {
  root: { props: {} },
  content: [
    make("Box", "page", {
      children: [
        make("Stack", "stack", {
          items: [
            make("Heading", "heading"),
            make("Card", "card", {
              body: [make("CardBody", "body")],
            }),
          ],
        }),
      ],
    }),
  ],
};

describe("buildParentMap", () => {
  it("maps every component to its parent location", () => {
    const map = buildParentMap(data);
    expect(map.get("page")).toMatchObject({
      parentId: null,
      slotKey: null,
      index: 0,
    });
    expect(map.get("stack")).toMatchObject({
      parentId: "page",
      slotKey: "children",
      index: 0,
    });
    expect(map.get("heading")).toMatchObject({
      parentId: "stack",
      slotKey: "items",
      index: 0,
    });
    expect(map.get("card")).toMatchObject({
      parentId: "stack",
      slotKey: "items",
      index: 1,
    });
    expect(map.get("body")).toMatchObject({
      parentId: "card",
      slotKey: "body",
      index: 0,
    });
  });
});

describe("getAncestry", () => {
  const parentMap = buildParentMap(data);

  it("returns empty for top-level component", () => {
    expect(getAncestry(parentMap, "page")).toEqual([]);
  });

  it("returns single entry for second-level component", () => {
    expect(getAncestry(parentMap, "stack")).toEqual([
      { id: "page", slotKey: null, index: 0 },
    ]);
  });

  it("returns oldest-first chain for deeply nested component", () => {
    expect(getAncestry(parentMap, "body")).toEqual([
      { id: "page", slotKey: null, index: 0 },
      { id: "stack", slotKey: "children", index: 0 },
      { id: "card", slotKey: "items", index: 1 },
    ]);
  });

  it("returns empty for unknown id", () => {
    expect(getAncestry(parentMap, "missing")).toEqual([]);
  });
});
