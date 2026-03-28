import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { findParent, reorderChild } from "./reorder.js";

// --- Factories ---

const spec = (children: string[]): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children },
    a: { type: "Text", props: { text: "A" } },
    b: { type: "Text", props: { text: "B" } },
    c: { type: "Text", props: { text: "C" } },
  },
});

const single = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["a"] },
    a: { type: "Text", props: { text: "A" } },
  },
});

const noChildren = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {} },
    a: { type: "Text", props: { text: "A" } },
  },
});

// --- findParent ---

describe("findParent", () => {
  it("finds parent and index for first child", () => {
    const result = findParent(spec(["a", "b", "c"]), "a");
    expect(result.isOk() && result.value).toEqual({
      parentId: "page",
      childIndex: 0,
    });
  });

  it("finds parent and index for last child", () => {
    const result = findParent(spec(["a", "b", "c"]), "c");
    expect(result.isOk() && result.value).toEqual({
      parentId: "page",
      childIndex: 2,
    });
  });

  it("fails for orphan element", () => {
    const s: Spec = {
      root: "page",
      elements: {
        page: { type: "Box", props: {}, children: [] },
        orphan: { type: "Text", props: { text: "x" } },
      },
    };
    const result = findParent(s, "orphan");
    expect(result.isErr() && result.error.tag).toBe("parent-not-found");
  });

  it("fails for nonexistent element", () => {
    const result = findParent(spec(["a"]), "zzz");
    expect(result.isErr() && result.error.tag).toBe("parent-not-found");
  });
});

// --- reorderChild ---

describe("reorderChild", () => {
  it("moves first to last", () => {
    const result = reorderChild(spec(["a", "b", "c"]), "page", 0, 2);
    expect(result.isOk() && result.value.elements.page.children).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("moves last to first", () => {
    const result = reorderChild(spec(["a", "b", "c"]), "page", 2, 0);
    expect(result.isOk() && result.value.elements.page.children).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("moves adjacent forward", () => {
    const result = reorderChild(spec(["a", "b", "c"]), "page", 0, 1);
    expect(result.isOk() && result.value.elements.page.children).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("moves adjacent backward", () => {
    const result = reorderChild(spec(["a", "b", "c"]), "page", 1, 0);
    expect(result.isOk() && result.value.elements.page.children).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("returns new spec (immutable)", () => {
    const original = spec(["a", "b", "c"]);
    const result = reorderChild(original, "page", 0, 2);
    expect(result.isOk() && result.value).not.toBe(original);
    expect(original.elements.page.children).toEqual(["a", "b", "c"]);
  });

  it("fails for same index", () => {
    const result = reorderChild(spec(["a", "b"]), "page", 0, 0);
    expect(result.isErr() && result.error.tag).toBe("same-index");
  });

  it("fails for out-of-bounds fromIndex", () => {
    const result = reorderChild(spec(["a", "b"]), "page", 5, 0);
    expect(result.isErr() && result.error.tag).toBe("index-out-of-bounds");
  });

  it("fails for out-of-bounds toIndex", () => {
    const result = reorderChild(spec(["a", "b"]), "page", 0, 5);
    expect(result.isErr() && result.error.tag).toBe("index-out-of-bounds");
  });

  it("fails for negative index", () => {
    const result = reorderChild(spec(["a", "b"]), "page", -1, 0);
    expect(result.isErr() && result.error.tag).toBe("index-out-of-bounds");
  });

  it("fails for nonexistent parent", () => {
    const result = reorderChild(spec(["a"]), "zzz", 0, 1);
    expect(result.isErr() && result.error.tag).toBe("element-not-found");
  });

  it("fails for parent with no children", () => {
    const result = reorderChild(noChildren(), "page", 0, 1);
    expect(result.isErr() && result.error.tag).toBe("no-children");
  });

  it("fails for single-child list (same index)", () => {
    const result = reorderChild(single(), "page", 0, 0);
    expect(result.isErr() && result.error.tag).toBe("same-index");
  });
});
