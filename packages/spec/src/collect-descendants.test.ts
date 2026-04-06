import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { collectDescendants } from "./collect-descendants.js";

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

describe("collectDescendants", () => {
  it("collects all descendants of root", () => {
    expect(collectDescendants(spec, "page")).toEqual(
      new Set(["a", "b", "c", "d"]),
    );
  });

  it("collects nested descendants", () => {
    expect(collectDescendants(spec, "a")).toEqual(new Set(["c", "d"]));
  });

  it("returns empty set for leaf", () => {
    expect(collectDescendants(spec, "b")).toEqual(new Set());
  });

  it("returns empty set for unknown element", () => {
    expect(collectDescendants(spec, "nope")).toEqual(new Set());
  });
});
