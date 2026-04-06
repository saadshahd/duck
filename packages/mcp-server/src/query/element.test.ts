import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { Effect } from "effect";
import { element } from "./element.js";

const spec: Spec = {
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["stack"] },
    stack: { type: "Stack", props: { gap: "1rem" }, children: ["heading"] },
    heading: { type: "Heading", props: { text: "Hello" } },
  },
};

describe("element", () => {
  it("returns full element with ancestry", async () => {
    const result = await Effect.runPromise(element(spec, "heading"));
    expect(result).toEqual({
      id: "heading",
      type: "Heading",
      props: { text: "Hello" },
      children: [],
      ancestry: [
        { id: "page", type: "Box" },
        { id: "stack", type: "Stack" },
      ],
    });
  });

  it("returns empty ancestry for root", async () => {
    const result = await Effect.runPromise(element(spec, "page"));
    expect(result.ancestry).toEqual([]);
  });

  it("fails with available IDs for unknown element", async () => {
    const result = await Effect.runPromiseExit(element(spec, "nope"));
    expect(result._tag).toBe("Failure");
    const err = (result as any).cause.error;
    expect(err._tag).toBe("QueryError");
    expect(err.context.availableIds).toEqual(["page", "stack", "heading"]);
  });
});
