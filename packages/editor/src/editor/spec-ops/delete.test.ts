import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { deleteElement } from "./delete.js";

// --- Factories ---

const leaf = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["a", "b", "c"] },
    a: { type: "Text", props: { text: "A" } },
    b: { type: "Text", props: { text: "B" } },
    c: { type: "Text", props: { text: "C" } },
  },
});

const nested = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["container", "x"] },
    container: { type: "Box", props: {}, children: ["a", "b"] },
    a: { type: "Text", props: { text: "A" } },
    b: { type: "Text", props: { text: "B" } },
    x: { type: "Text", props: { text: "X" } },
  },
});

// --- deleteElement ---

describe("deleteElement", () => {
  it("deletes a leaf element", () => {
    const result = deleteElement(leaf(), "b");
    expect(result.isOk() && result.value.elements.page.children).toEqual([
      "a",
      "c",
    ]);
    expect(result.isOk() && result.value.elements).not.toHaveProperty("b");
  });

  it("deletes first child", () => {
    const result = deleteElement(leaf(), "a");
    expect(result.isOk() && result.value.elements.page.children).toEqual([
      "b",
      "c",
    ]);
  });

  it("deletes last child", () => {
    const result = deleteElement(leaf(), "c");
    expect(result.isOk() && result.value.elements.page.children).toEqual([
      "a",
      "b",
    ]);
  });

  it("deletes a subtree (element + all descendants)", () => {
    const result = deleteElement(nested(), "container");
    expect(result.isOk() && result.value.elements.page.children).toEqual(["x"]);
    const elements = result.isOk() && result.value.elements;
    expect(elements).not.toHaveProperty("container");
    expect(elements).not.toHaveProperty("a");
    expect(elements).not.toHaveProperty("b");
    expect(elements).toHaveProperty("x");
  });

  it("returns new spec (immutable)", () => {
    const original = leaf();
    const result = deleteElement(original, "b");
    expect(result.isOk() && result.value).not.toBe(original);
    expect(original.elements.page.children).toEqual(["a", "b", "c"]);
    expect(original.elements).toHaveProperty("b");
  });

  it("fails for root element", () => {
    const result = deleteElement(leaf(), "page");
    expect(result.isErr() && result.error.tag).toBe("cannot-delete-root");
  });

  it("fails for nonexistent element", () => {
    const result = deleteElement(leaf(), "zzz");
    expect(result.isErr() && result.error.tag).toBe("parent-not-found");
  });
});
