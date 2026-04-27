import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { foldTree } from "./fold-tree.js";

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
      items: [make("Heading", "h1"), make("Text", "t1", { text: "hello" })],
    }),
    make("Footer", "footer"),
  ],
};

describe("foldTree", () => {
  it("returns one result per data.content entry", () => {
    const ids = foldTree<string>(data, (c) => c.props.id as string);
    expect(ids).toEqual(["stack", "footer"]);
  });

  it("counts total components per top-level subtree", () => {
    const counts = foldTree<number>(data, (_c, slots) =>
      Object.values(slots)
        .flat()
        .reduce((sum, n) => sum + n, 1),
    );
    expect(counts).toEqual([3, 1]);
  });

  it("rebuilds a transformed tree with slot grouping", () => {
    type Node = { id: string; slots: Record<string, Node[]> };
    const trees = foldTree<Node>(data, (c, slots) => ({
      id: c.props.id as string,
      slots,
    }));
    expect(trees).toEqual([
      {
        id: "stack",
        slots: {
          items: [
            { id: "h1", slots: {} },
            { id: "t1", slots: {} },
          ],
        },
      },
      { id: "footer", slots: {} },
    ]);
  });

  it("returns empty array for empty content", () => {
    const empty: Data = { root: { props: {} }, content: [] };
    expect(foldTree(empty, () => 1)).toEqual([]);
  });
});
