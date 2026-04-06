import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { Effect } from "effect";
import { typeQuery } from "./type-query.js";

const spec: Spec = {
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["a", "b", "c"] },
    a: { type: "Button", props: { label: "Save" } },
    b: { type: "Text", props: { text: "hello" } },
    c: { type: "Button", props: { label: "Cancel" } },
  },
};

describe("typeQuery", () => {
  it("finds all elements of a type with ancestry", async () => {
    const result = await Effect.runPromise(typeQuery(spec, "Button"));
    expect(result.count).toBe(2);
    expect(result.elements.map((e) => e.id)).toEqual(["a", "c"]);
    expect(result.elements[0].ancestry).toEqual([{ id: "page", type: "Box" }]);
  });

  it("returns empty for unmatched type", async () => {
    const result = await Effect.runPromise(typeQuery(spec, "Image"));
    expect(result).toEqual({ elements: [], count: 0 });
  });
});
