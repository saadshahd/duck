import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { preOrder } from "./pre-order.js";

const spec: Spec = {
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["stack", "footer"] },
    stack: { type: "Stack", props: {}, children: ["heading", "card"] },
    heading: { type: "Heading", props: {} },
    card: { type: "Card", props: {}, children: ["body"] },
    body: { type: "CardBody", props: {} },
    footer: { type: "Footer", props: {} },
  },
};

describe("preOrder", () => {
  it("walks depth-first pre-order", () => {
    expect(preOrder(spec)).toEqual([
      "page",
      "stack",
      "heading",
      "card",
      "body",
      "footer",
    ]);
  });

  it("returns just root for single-element spec", () => {
    const single: Spec = {
      root: "r",
      elements: { r: { type: "Box", props: {} } },
    };
    expect(preOrder(single)).toEqual(["r"]);
  });
});
