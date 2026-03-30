import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { nearestSibling } from "./helpers.js";

const spec = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["a", "b", "c"] },
    a: { type: "Text", props: { text: "A" } },
    b: { type: "Text", props: { text: "B" } },
    c: { type: "Text", props: { text: "C" } },
  },
});

const twoChildren = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["a", "b"] },
    a: { type: "Text", props: { text: "A" } },
    b: { type: "Text", props: { text: "B" } },
  },
});

const oneChild = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["a"] },
    a: { type: "Text", props: { text: "A" } },
  },
});

describe("nearestSibling", () => {
  it("returns next sibling when deleting first", () => {
    expect(nearestSibling(spec(), "page", "a")).toBe("b");
  });

  it("returns next sibling when deleting middle", () => {
    expect(nearestSibling(spec(), "page", "b")).toBe("c");
  });

  it("returns previous sibling when deleting last", () => {
    expect(nearestSibling(spec(), "page", "c")).toBe("b");
  });

  it("returns next sibling when deleting first of two", () => {
    expect(nearestSibling(twoChildren(), "page", "a")).toBe("b");
  });

  it("returns previous sibling when deleting last of two", () => {
    expect(nearestSibling(twoChildren(), "page", "b")).toBe("a");
  });

  it("returns parent when deleting only child", () => {
    expect(nearestSibling(oneChild(), "page", "a")).toBe("page");
  });
});
