import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { foldTree } from "./fold-tree.js";

const spec: Spec = {
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["a", "b"] },
    a: { type: "Stack", props: {}, children: ["c"] },
    b: { type: "Text", props: { text: "hello" } },
    c: { type: "Text", props: { text: "nested" } },
  },
};

describe("foldTree", () => {
  it("collects all IDs in pre-order via fold", () => {
    const ids = foldTree<string[]>(spec, spec.root, (id, _el, children) => [
      id,
      ...children.flat(),
    ]);
    expect(ids).toEqual(["page", "a", "c", "b"]);
  });

  it("counts total elements", () => {
    const count = foldTree<number>(spec, spec.root, (_id, _el, children) =>
      children.reduce((sum, c) => sum + c, 1),
    );
    expect(count).toBe(4);
  });

  it("builds a transformed tree", () => {
    type Node = { id: string; kids: Node[] };
    const tree = foldTree<Node>(spec, spec.root, (id, _el, children) => ({
      id,
      kids: children,
    }));
    expect(tree).toEqual({
      id: "page",
      kids: [
        { id: "a", kids: [{ id: "c", kids: [] }] },
        { id: "b", kids: [] },
      ],
    });
  });

  it("handles missing element gracefully", () => {
    const result = foldTree<string>(spec, "nope", (id) => id);
    expect(result).toBe("nope");
  });
});
