import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { Effect } from "effect";
import { outline } from "./outline.js";

const spec: Spec = {
  root: "page",
  elements: {
    page: {
      type: "Box",
      props: { bg: "white" },
      children: ["stack", "footer"],
    },
    stack: {
      type: "Stack",
      props: { gap: "1rem" },
      children: ["heading", "card"],
    },
    heading: { type: "Heading", props: { text: "Hello" } },
    card: { type: "Card", props: {}, children: ["body"] },
    body: { type: "Text", props: { text: "content" } },
    footer: { type: "Footer", props: { text: "bye" } },
  },
};

describe("outline", () => {
  it("depth=1 returns summary for children", async () => {
    const result = await Effect.runPromise(outline(spec, 1));
    expect(result.totalElements).toBe(6);
    expect(result.outline).toEqual({
      id: "page",
      type: "Box",
      props: { bg: "white" },
      children: [
        { id: "stack", type: "Stack", childCount: 2 },
        { id: "footer", type: "Footer", childCount: 0 },
      ],
    });
  });

  it("depth=3 includes props through card level", async () => {
    const result = await Effect.runPromise(outline(spec, 3));
    const stack = (result.outline as any).children[0];
    expect(stack.props).toEqual({ gap: "1rem" });
    const card = stack.children[1];
    expect(card.props).toEqual({});
    expect(card.children[0]).toEqual({
      id: "body",
      type: "Text",
      childCount: 0,
    });
  });

  it("defaults to depth=2", async () => {
    const result = await Effect.runPromise(outline(spec));
    const stack = (result.outline as any).children[0];
    expect("props" in stack).toBe(true);
    expect("childCount" in stack.children[0]).toBe(true);
  });
});
