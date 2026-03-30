import { describe, test, expect } from "bun:test";
import { nextInTreeOrder } from "./navigation.js";
import type { Spec } from "@json-render/core";

// Pre-order: page, stack, heading, text, card, card-body, footer
const spec: Spec = {
  root: "page",
  elements: {
    page: { type: "Page", props: {}, children: ["stack", "footer"] },
    stack: { type: "Stack", props: {}, children: ["heading", "text", "card"] },
    heading: { type: "Heading", props: {} },
    text: { type: "Text", props: {} },
    card: { type: "Card", props: {}, children: ["card-body"] },
    "card-body": { type: "CardBody", props: {} },
    footer: { type: "Footer", props: {} },
  },
};

// --- Forward traversal (depth-first pre-order) ---

describe("forward traversal", () => {
  test("root → first child", () => {
    expect(nextInTreeOrder(spec, "page", "forward")).toEqual({
      tag: "select",
      targetId: "stack",
    });
  });

  test("parent → first child (enter container)", () => {
    expect(nextInTreeOrder(spec, "stack", "forward")).toEqual({
      tag: "select",
      targetId: "heading",
    });
  });

  test("sibling → next sibling", () => {
    expect(nextInTreeOrder(spec, "heading", "forward")).toEqual({
      tag: "select",
      targetId: "text",
    });
  });

  test("sibling → next sibling (to container)", () => {
    expect(nextInTreeOrder(spec, "text", "forward")).toEqual({
      tag: "select",
      targetId: "card",
    });
  });

  test("container → first child", () => {
    expect(nextInTreeOrder(spec, "card", "forward")).toEqual({
      tag: "select",
      targetId: "card-body",
    });
  });

  test("last child crosses to uncle (parent's next sibling)", () => {
    expect(nextInTreeOrder(spec, "card-body", "forward")).toEqual({
      tag: "select",
      targetId: "footer",
    });
  });

  test("last element in doc → deselect", () => {
    expect(nextInTreeOrder(spec, "footer", "forward")).toEqual({
      tag: "deselect",
    });
  });
});

// --- Backward traversal (reverse pre-order) ---

describe("backward traversal", () => {
  test("root → deselect (nothing before root)", () => {
    expect(nextInTreeOrder(spec, "page", "backward")).toEqual({
      tag: "deselect",
    });
  });

  test("first child → parent", () => {
    expect(nextInTreeOrder(spec, "stack", "backward")).toEqual({
      tag: "select",
      targetId: "page",
    });
  });

  test("sibling → prev sibling", () => {
    expect(nextInTreeOrder(spec, "text", "backward")).toEqual({
      tag: "select",
      targetId: "heading",
    });
  });

  test("uncle → deepest descendant of prev subtree", () => {
    expect(nextInTreeOrder(spec, "footer", "backward")).toEqual({
      tag: "select",
      targetId: "card-body",
    });
  });

  test("first child of nested → parent", () => {
    expect(nextInTreeOrder(spec, "card-body", "backward")).toEqual({
      tag: "select",
      targetId: "card",
    });
  });

  test("first grandchild → parent", () => {
    expect(nextInTreeOrder(spec, "heading", "backward")).toEqual({
      tag: "select",
      targetId: "stack",
    });
  });
});

// --- Full walk ---

describe("full document walk", () => {
  test("forward walk visits every element in pre-order", () => {
    const visited: string[] = [];
    let current = "page";
    visited.push(current);
    for (let i = 0; i < 20; i++) {
      const result = nextInTreeOrder(spec, current, "forward");
      if (result.tag === "deselect") break;
      visited.push(result.targetId);
      current = result.targetId;
    }
    expect(visited).toEqual([
      "page",
      "stack",
      "heading",
      "text",
      "card",
      "card-body",
      "footer",
    ]);
  });

  test("backward walk from last visits every element in reverse", () => {
    const visited: string[] = [];
    let current = "footer";
    visited.push(current);
    for (let i = 0; i < 20; i++) {
      const result = nextInTreeOrder(spec, current, "backward");
      if (result.tag === "deselect") break;
      visited.push(result.targetId);
      current = result.targetId;
    }
    expect(visited).toEqual([
      "footer",
      "card-body",
      "card",
      "text",
      "heading",
      "stack",
      "page",
    ]);
  });
});

// --- Edge cases ---

describe("edge cases", () => {
  test("unknown element → deselect", () => {
    expect(nextInTreeOrder(spec, "nonexistent", "forward")).toEqual({
      tag: "deselect",
    });
  });
});
