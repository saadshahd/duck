import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { findParent } from "./find-parent.js";

const spec: Spec = {
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["a", "b"] },
    a: { type: "Text", props: {} },
    b: { type: "Stack", props: {}, children: ["c"] },
    c: { type: "Text", props: {} },
  },
};

describe("findParent", () => {
  it("finds direct child of root", () => {
    expect(findParent(spec, "a")).toEqual({ parentId: "page", childIndex: 0 });
  });

  it("finds second child with correct index", () => {
    expect(findParent(spec, "b")).toEqual({ parentId: "page", childIndex: 1 });
  });

  it("finds nested child", () => {
    expect(findParent(spec, "c")).toEqual({ parentId: "b", childIndex: 0 });
  });

  it("returns null for root element", () => {
    expect(findParent(spec, "page")).toBeNull();
  });

  it("returns null for unknown ID", () => {
    expect(findParent(spec, "nope")).toBeNull();
  });
});
