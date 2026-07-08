import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { nearestSibling } from "./nearest-sibling.js";

const el = (id: string, children?: ComponentData[]): ComponentData => ({
  type: "Box",
  props: { id, ...(children ? { children } : {}) },
});

const data = (content: ComponentData[]): Data => ({
  root: { props: {} },
  content,
});

const abc = data([el("a"), el("b"), el("c")]);
const abcNested = data([el("parent", [el("a"), el("b"), el("c")])]);
const oneChild = data([el("parent", [el("a")])]);
const oneRoot = data([el("a")]);

describe("nearestSibling", () => {
  const slot = { at: "slot", parentId: "parent", path: ["children"] } as const;
  const root = { at: "root" } as const;

  it("returns previous sibling when deleting middle child", () => {
    expect(nearestSibling(abcNested, slot, "b")).toBe("a");
  });

  it("returns previous sibling when deleting last child", () => {
    expect(nearestSibling(abcNested, slot, "c")).toBe("b");
  });

  it("returns next sibling when deleting first child (no previous)", () => {
    expect(nearestSibling(abcNested, slot, "a")).toBe("b");
  });

  it("returns parent when deleting only child", () => {
    expect(nearestSibling(oneChild, slot, "a")).toBe("parent");
  });

  it("returns null when deleting sole root-level element", () => {
    expect(nearestSibling(oneRoot, root, "a")).toBeNull();
  });

  it("returns previous sibling at root level", () => {
    expect(nearestSibling(abc, root, "b")).toBe("a");
  });

  it("returns next sibling at root level when first", () => {
    expect(nearestSibling(abc, root, "a")).toBe("b");
  });
});
