import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { moveChild } from "./reorder.js";
import { collectDescendants } from "./helpers.js";

// --- Factories ---

/** Two parents (left, right) each with children under a shared root. */
const twoParents = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["left", "right"] },
    left: { type: "Stack", props: {}, children: ["a", "b"] },
    right: { type: "Stack", props: {}, children: ["c", "d"] },
    a: { type: "Text", props: { text: "A" } },
    b: { type: "Text", props: { text: "B" } },
    c: { type: "Text", props: { text: "C" } },
    d: { type: "Text", props: { text: "D" } },
  },
});

/** Nested: page → parent → child → grandchild. */
const nested = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["parent"] },
    parent: { type: "Stack", props: {}, children: ["child"] },
    child: { type: "Stack", props: {}, children: ["grandchild"] },
    grandchild: { type: "Text", props: { text: "G" } },
  },
});

/** Target has an empty children array. */
const emptyTarget = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["src", "tgt"] },
    src: { type: "Stack", props: {}, children: ["a"] },
    tgt: { type: "Stack", props: {}, children: [] },
    a: { type: "Text", props: { text: "A" } },
  },
});

/** Target has no children property at all. */
const noChildrenTarget = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["src", "tgt"] },
    src: { type: "Stack", props: {}, children: ["a"] },
    tgt: { type: "Text", props: {} },
    a: { type: "Text", props: { text: "A" } },
  },
});

// --- collectDescendants ---

describe("collectDescendants", () => {
  it("returns all descendants of a subtree", () => {
    const s = nested();
    const desc = collectDescendants(s, "parent");
    expect(desc).toEqual(new Set(["child", "grandchild"]));
  });

  it("returns empty set for leaf node", () => {
    const s = nested();
    expect(collectDescendants(s, "grandchild").size).toBe(0);
  });

  it("returns empty set for nonexistent element", () => {
    const s = nested();
    expect(collectDescendants(s, "zzz").size).toBe(0);
  });
});

// --- moveChild ---

describe("moveChild", () => {
  it("moves element from one parent to another", () => {
    const result = moveChild(twoParents(), "left", 0, "right", 0);
    expect(result.isOk()).toBe(true);
    const s = result._unsafeUnwrap();
    expect(s.elements.left.children).toEqual(["b"]);
    expect(s.elements.right.children).toEqual(["a", "c", "d"]);
  });

  it("moves element to end of target", () => {
    const result = moveChild(twoParents(), "left", 0, "right", 2);
    expect(result.isOk()).toBe(true);
    const s = result._unsafeUnwrap();
    expect(s.elements.left.children).toEqual(["b"]);
    expect(s.elements.right.children).toEqual(["c", "d", "a"]);
  });

  it("moves into empty container", () => {
    const result = moveChild(emptyTarget(), "src", 0, "tgt", 0);
    expect(result.isOk()).toBe(true);
    const s = result._unsafeUnwrap();
    expect(s.elements.src.children).toEqual([]);
    expect(s.elements.tgt.children).toEqual(["a"]);
  });

  it("moves into element with no children property (creates array)", () => {
    const result = moveChild(noChildrenTarget(), "src", 0, "tgt", 0);
    expect(result.isOk()).toBe(true);
    const s = result._unsafeUnwrap();
    expect(s.elements.src.children).toEqual([]);
    expect(s.elements.tgt.children).toEqual(["a"]);
  });

  it("delegates to reorderChild for same parent", () => {
    const result = moveChild(twoParents(), "left", 0, "left", 1);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().elements.left.children).toEqual(["b", "a"]);
  });

  it("returns immutable result (original unchanged)", () => {
    const original = twoParents();
    const result = moveChild(original, "left", 0, "right", 0);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).not.toBe(original);
    expect(original.elements.left.children).toEqual(["a", "b"]);
    expect(original.elements.right.children).toEqual(["c", "d"]);
  });

  // --- Error cases ---

  it("rejects circular move: drop parent into own child", () => {
    const result = moveChild(nested(), "page", 0, "child", 0);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("circular-move");
  });

  it("rejects circular move: drop parent into own grandchild", () => {
    const result = moveChild(nested(), "page", 0, "grandchild", 0);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("circular-move");
  });

  it("rejects circular move: drop into self", () => {
    // "parent" is at index 0 of "page", try to move into "parent" itself
    const result = moveChild(nested(), "page", 0, "parent", 0);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("circular-move");
  });

  it("rejects out-of-bounds source index", () => {
    const result = moveChild(twoParents(), "left", 5, "right", 0);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("index-out-of-bounds");
  });

  it("rejects out-of-bounds target index", () => {
    const result = moveChild(twoParents(), "left", 0, "right", 10);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("index-out-of-bounds");
  });

  it("rejects nonexistent source parent", () => {
    const result = moveChild(twoParents(), "zzz", 0, "right", 0);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("element-not-found");
  });

  it("rejects nonexistent target parent", () => {
    const result = moveChild(twoParents(), "left", 0, "zzz", 0);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("element-not-found");
  });
});
