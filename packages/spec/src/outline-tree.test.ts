import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { outlineTree } from "./outline-tree.js";

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
      gap: "1rem",
      items: [
        make("Heading", "h1", { text: "Hello" }),
        make("Card", "card", { body: [make("Text", "body", { text: "x" })] }),
      ],
    }),
    make("Footer", "footer", { text: "bye" }),
  ],
};

describe("outlineTree", () => {
  it("default depth is 2", () => {
    const tree = outlineTree(data);
    const stack = tree[0] as Extract<(typeof tree)[number], { props: unknown }>;
    expect("props" in stack).toBe(true);
    const h1 = stack.slots.items[0];
    expect("childCount" in h1).toBe(true);
    expect(h1).toEqual({ id: "h1", type: "Heading", childCount: 0 });
  });

  it("excludes slot keys from props in FullNode", () => {
    const tree = outlineTree(data, 1);
    const stack = tree[0] as Extract<(typeof tree)[number], { props: unknown }>;
    expect(stack.props).toEqual({ id: "stack", gap: "1rem" });
    expect(stack.props).not.toHaveProperty("items");
  });

  it("childCount sums children across all slots", () => {
    const tree = outlineTree(data, 0);
    expect(tree[0]).toEqual({ id: "stack", type: "Stack", childCount: 2 });
  });

  it("recurses through multiple levels at higher depth", () => {
    const tree = outlineTree(data, 3);
    const stack = tree[0] as Extract<(typeof tree)[number], { props: unknown }>;
    const card = stack.slots.items[1] as Extract<
      (typeof tree)[number],
      { props: unknown }
    >;
    expect("props" in card).toBe(true);
    expect(card.slots.body[0]).toEqual({
      id: "body",
      type: "Text",
      childCount: 0,
    });
  });

  it("returns one entry per data.content[i]", () => {
    const tree = outlineTree(data, 1);
    expect(tree).toHaveLength(2);
    expect(tree[1]).toMatchObject({ id: "footer", type: "Footer" });
  });
});
