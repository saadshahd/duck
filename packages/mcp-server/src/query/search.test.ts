import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { Effect } from "effect";
import { search } from "./search.js";

const spec: Spec = {
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["hero", "cta"] },
    hero: {
      type: "Text",
      props: { text: "Visual Editor for json-render" },
    },
    cta: { type: "Button", props: { label: "Get Started", href: "/start" } },
  },
};

describe("search", () => {
  it("finds case-insensitive matches in prop values", async () => {
    const result = await Effect.runPromise(search(spec, "visual"));
    expect(result.count).toBe(1);
    expect(result.results[0].id).toBe("hero");
    expect(result.results[0].propKey).toBe("text");
  });

  it("finds matches across multiple props", async () => {
    const result = await Effect.runPromise(search(spec, "start"));
    expect(result.count).toBe(2);
    expect(result.results.map((r) => r.propKey).sort()).toEqual([
      "href",
      "label",
    ]);
  });

  it("returns empty for no matches", async () => {
    const result = await Effect.runPromise(search(spec, "zzz"));
    expect(result).toEqual({ results: [], count: 0 });
  });

  it("includes ancestry in results", async () => {
    const result = await Effect.runPromise(search(spec, "visual"));
    expect(result.results[0].ancestry).toEqual([{ id: "page", type: "Box" }]);
  });
});
