import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { buildIndex } from "./build-index.js";

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
    }),
    make("Footer", "footer"),
  ],
};

describe("buildIndex", () => {
  it("indexes every component by id", () => {
    const idx = buildIndex(data);
    expect([...idx.keys()].sort()).toEqual(
      ["footer", "h1", "stack", "t1"].sort(),
    );
  });

  it("includes path for nested components", () => {
    const idx = buildIndex(data);
    expect(idx.get("h1")?.path).toEqual([
      { parentId: null, slotKey: null, index: 0 },
      { parentId: "stack", slotKey: "items", index: 0 },
    ]);
  });

  it("last write wins on duplicate ids", () => {
    const dupe: Data = {
      root: { props: {} },
      content: [make("A", "x"), make("B", "x")],
    };
    const idx = buildIndex(dupe);
    expect(idx.get("x")?.component.type).toBe("B");
  });
});
