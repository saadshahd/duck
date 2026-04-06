import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { Effect } from "effect";
import { subtree } from "./subtree.js";

const spec: Spec = {
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["stack"] },
    stack: { type: "Stack", props: { gap: "1rem" }, children: ["a", "b"] },
    a: { type: "Text", props: { text: "A" } },
    b: { type: "Card", props: {}, children: ["c"] },
    c: { type: "Text", props: { text: "C" } },
  },
};

describe("subtree", () => {
  it("returns element with all descendants", async () => {
    const result = await Effect.runPromise(subtree(spec, "stack"));
    expect(result).toEqual({
      id: "stack",
      type: "Stack",
      props: { gap: "1rem" },
      children: [
        { id: "a", type: "Text", props: { text: "A" }, children: [] },
        {
          id: "b",
          type: "Card",
          props: {},
          children: [
            { id: "c", type: "Text", props: { text: "C" }, children: [] },
          ],
        },
      ],
      ancestry: [{ id: "page", type: "Box" }],
    });
  });

  it("fails with available IDs for unknown element", async () => {
    const result = await Effect.runPromiseExit(subtree(spec, "nope"));
    expect(result._tag).toBe("Failure");
  });
});
