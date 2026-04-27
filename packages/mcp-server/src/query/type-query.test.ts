import { describe, it, expect } from "bun:test";
import type { Data } from "@puckeditor/core";
import { Effect } from "effect";
import { typeQuery } from "./type-query.js";

const data: Data = {
  root: { props: {} },
  content: [
    {
      type: "Box",
      props: {
        id: "page",
        children: [
          { type: "Button", props: { id: "a", label: "Save" } },
          { type: "Text", props: { id: "b", text: "hello" } },
          { type: "Button", props: { id: "c", label: "Cancel" } },
        ],
      },
    },
  ],
};

describe("typeQuery", () => {
  it("finds all elements of a type with ancestry", async () => {
    const result = await Effect.runPromise(typeQuery(data, "Button"));
    expect(result.count).toBe(2);
    expect(result.elements.map((e) => e.id)).toEqual(["a", "c"]);
    expect(result.elements[0]!.ancestry.map((a) => a.id)).toEqual(["page"]);
  });

  it("returns empty for unmatched type", async () => {
    const result = await Effect.runPromise(typeQuery(data, "Image"));
    expect(result).toEqual({ elements: [], count: 0 });
  });
});
