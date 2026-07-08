import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { allIds } from "./all-ids.js";

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
      items: [make("Heading", "heading"), make("Text", "text")],
    }),
    make("Footer", "footer"),
  ],
};

describe("allIds", () => {
  it("yields ids in pre-order", () => {
    expect(allIds(data)).toEqual(["stack", "heading", "text", "footer"]);
  });

  it("returns empty for empty content", () => {
    const empty: Data = { root: { props: {} }, content: [] };
    expect(allIds(empty)).toEqual([]);
  });
});
