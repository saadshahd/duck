import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { insertElement } from "./insert.js";

// --- Factories ---

const base = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["text-1", "card-1"] },
    "text-1": { type: "Text", props: { text: "hello" } },
    "card-1": { type: "Card", props: {}, children: ["text-2"] },
    "text-2": { type: "Text", props: { text: "inside card" } },
  },
});

// --- insertElement: child ---

describe("insertElement — child", () => {
  it("inserts as last child of parent", () => {
    const result = insertElement(base(), "page", { tag: "child" }, "Button", {
      props: { label: "Click" },
    });
    expect(result.isOk()).toBe(true);
    const { spec, elementId } = result._unsafeUnwrap();
    expect(spec.elements.page.children).toEqual([
      "text-1",
      "card-1",
      elementId,
    ]);
    expect(spec.elements[elementId]).toEqual({
      type: "Button",
      props: { label: "Click" },
    });
  });

  it("errors when target has no children array", () => {
    const result = insertElement(base(), "text-1", { tag: "child" }, "Button");
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("no-children");
  });
});

// --- insertElement: after ---

describe("insertElement — after", () => {
  it("inserts after specified sibling", () => {
    const result = insertElement(base(), "text-1", { tag: "after" }, "Divider");
    const { spec, elementId } = result._unsafeUnwrap();
    expect(spec.elements.page.children).toEqual([
      "text-1",
      elementId,
      "card-1",
    ]);
  });

  it("inserts after last child", () => {
    const result = insertElement(base(), "card-1", { tag: "after" }, "Footer");
    const { spec, elementId } = result._unsafeUnwrap();
    expect(spec.elements.page.children).toEqual([
      "text-1",
      "card-1",
      elementId,
    ]);
  });

  it("inserts after nested child", () => {
    const result = insertElement(base(), "text-2", { tag: "after" }, "Image");
    const { spec, elementId } = result._unsafeUnwrap();
    expect(spec.elements["card-1"].children).toEqual(["text-2", elementId]);
  });
});

// --- ID generation ---

describe("insertElement — ID generation", () => {
  it("increments past existing IDs", () => {
    const result = insertElement(base(), "page", { tag: "child" }, "Text");
    const { elementId } = result._unsafeUnwrap();
    expect(elementId).toBe("text-3");
  });

  it("starts at 1 for new types", () => {
    const result = insertElement(base(), "page", { tag: "child" }, "Button");
    const { elementId } = result._unsafeUnwrap();
    expect(elementId).toBe("button-1");
  });
});

// --- Default props ---

describe("insertElement — defaults", () => {
  it("applies default props", () => {
    const result = insertElement(base(), "page", { tag: "child" }, "Button", {
      props: { label: "Go", variant: "primary" },
    });
    const { spec, elementId } = result._unsafeUnwrap();
    expect(spec.elements[elementId].props).toEqual({
      label: "Go",
      variant: "primary",
    });
  });

  it("creates element with children array when specified", () => {
    const result = insertElement(base(), "page", { tag: "child" }, "Card", {
      children: [],
    });
    const { spec, elementId } = result._unsafeUnwrap();
    expect(spec.elements[elementId].children).toEqual([]);
  });

  it("uses empty props when no defaults given", () => {
    const result = insertElement(base(), "page", { tag: "child" }, "Spacer");
    const { spec, elementId } = result._unsafeUnwrap();
    expect(spec.elements[elementId].props).toEqual({});
  });
});

// --- Immutability ---

describe("insertElement — immutability", () => {
  it("does not mutate original spec", () => {
    const original = base();
    const originalChildren = [...original.elements.page.children!];
    const originalKeys = Object.keys(original.elements);

    insertElement(original, "page", { tag: "child" }, "Button");

    expect(original.elements.page.children).toEqual(originalChildren);
    expect(Object.keys(original.elements)).toEqual(originalKeys);
  });
});
