import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { topologicalRoots } from "./topological-roots.js";

const spec: Spec = {
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["a", "b"] },
    a: { type: "Stack", props: {}, children: ["c", "d"] },
    b: { type: "Text", props: {} },
    c: { type: "Text", props: {} },
    d: { type: "Text", props: {} },
  },
};

describe("topologicalRoots", () => {
  it("returns only top-level selected elements", () => {
    expect(topologicalRoots(spec, new Set(["a", "c", "d"]))).toEqual(["a"]);
  });

  it("returns siblings in pre-order", () => {
    expect(topologicalRoots(spec, new Set(["a", "b"]))).toEqual(["a", "b"]);
  });

  it("returns empty for empty selection", () => {
    expect(topologicalRoots(spec, new Set())).toEqual([]);
  });

  it("skips descendants of selected ancestors", () => {
    expect(topologicalRoots(spec, new Set(["page"]))).toEqual(["page"]);
  });
});
