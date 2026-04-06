import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { outlineTree } from "./outline-tree.js";

const spec: Spec = {
  root: "page",
  elements: {
    page: {
      type: "Box",
      props: { style: { margin: 0 } },
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

describe("outlineTree", () => {
  it("depth=1 shows full root, summary children", () => {
    const tree = outlineTree(spec, 1);
    expect(tree).toEqual({
      id: "page",
      type: "Box",
      props: { style: { margin: 0 } },
      children: [
        { id: "stack", type: "Stack", childCount: 2 },
        { id: "footer", type: "Footer", childCount: 0 },
      ],
    });
  });

  it("depth=3 shows full detail through card→body", () => {
    const tree = outlineTree(spec, 3);
    expect("props" in tree).toBe(true);
    const stack = (tree as any).children[0];
    expect("props" in stack).toBe(true);
    const card = stack.children[1];
    expect("props" in card).toBe(true);
    expect(card.children[0]).toEqual({
      id: "body",
      type: "Text",
      childCount: 0,
    });
  });

  it("default depth is 2", () => {
    const tree = outlineTree(spec);
    const stack = (tree as any).children[0];
    expect("props" in stack).toBe(true);
    const heading = stack.children[0];
    expect("childCount" in heading).toBe(true);
  });
});
