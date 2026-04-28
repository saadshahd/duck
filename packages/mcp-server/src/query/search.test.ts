import { describe, it, expect } from "bun:test";
import type { Data } from "@puckeditor/core";
import { Effect } from "effect";
import { search } from "./search.js";

const data: Data = {
  root: { props: {} },
  content: [
    {
      type: "Box",
      props: {
        id: "page",
        children: [
          {
            type: "Text",
            props: { id: "hero", text: "Duck — Puck without the iframe" },
          },
          {
            type: "Button",
            props: { id: "cta", label: "Get Started", href: "/start" },
          },
        ],
      },
    },
  ],
};

describe("search", () => {
  it("finds case-insensitive matches in prop values", async () => {
    const result = await Effect.runPromise(search(data, "puck"));
    expect(result.count).toBe(1);
    expect(result.results[0]!.id).toBe("hero");
    expect(result.results[0]!.propPath).toBe("text");
  });

  it("finds matches across multiple props", async () => {
    const result = await Effect.runPromise(search(data, "start"));
    expect(result.count).toBe(2);
    expect(result.results.map((r) => r.propPath).sort()).toEqual([
      "href",
      "label",
    ]);
  });

  it("returns empty for no matches", async () => {
    const result = await Effect.runPromise(search(data, "zzz"));
    expect(result).toEqual({ results: [], count: 0 });
  });

  it("includes ancestry in results", async () => {
    const result = await Effect.runPromise(search(data, "puck"));
    expect(result.results[0]!.ancestry.map((a) => a.id)).toEqual(["page"]);
  });
});
