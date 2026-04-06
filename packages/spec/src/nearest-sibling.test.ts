import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { nearestSibling } from "./nearest-sibling.js";

const spec: Spec = {
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["a", "b", "c"] },
    a: { type: "Text", props: {} },
    b: { type: "Text", props: {} },
    c: { type: "Text", props: {} },
  },
};

describe("nearestSibling", () => {
  it("returns next sibling when deleting first", () => {
    expect(nearestSibling(spec, "page", "a")).toBe("b");
  });

  it("returns next sibling when deleting middle", () => {
    expect(nearestSibling(spec, "page", "b")).toBe("c");
  });

  it("returns previous sibling when deleting last", () => {
    expect(nearestSibling(spec, "page", "c")).toBe("b");
  });

  it("returns parent when deleting only child", () => {
    const oneChild: Spec = {
      root: "page",
      elements: {
        page: { type: "Box", props: {}, children: ["a"] },
        a: { type: "Text", props: {} },
      },
    };
    expect(nearestSibling(oneChild, "page", "a")).toBe("page");
  });
});
