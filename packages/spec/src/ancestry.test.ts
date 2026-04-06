import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { buildParentMap, getAncestry } from "./ancestry.js";

const spec: Spec = {
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["stack"] },
    stack: { type: "Stack", props: {}, children: ["heading", "card"] },
    heading: { type: "Heading", props: {} },
    card: { type: "Card", props: {}, children: ["body"] },
    body: { type: "CardBody", props: {} },
  },
};

describe("buildParentMap", () => {
  it("maps every non-root element to its parent", () => {
    const map = buildParentMap(spec);
    expect(map.get("stack")).toBe("page");
    expect(map.get("heading")).toBe("stack");
    expect(map.get("card")).toBe("stack");
    expect(map.get("body")).toBe("card");
  });

  it("does not include root", () => {
    expect(buildParentMap(spec).has("page")).toBe(false);
  });
});

describe("getAncestry", () => {
  const parentMap = buildParentMap(spec);

  it("returns empty for root", () => {
    expect(getAncestry(spec, parentMap, "page")).toEqual([]);
  });

  it("returns root for direct child", () => {
    expect(getAncestry(spec, parentMap, "stack")).toEqual([
      { id: "page", type: "Box" },
    ]);
  });

  it("returns full chain for deeply nested element", () => {
    expect(getAncestry(spec, parentMap, "body")).toEqual([
      { id: "page", type: "Box" },
      { id: "stack", type: "Stack" },
      { id: "card", type: "Card" },
    ]);
  });

  it("returns chain for mid-level element", () => {
    expect(getAncestry(spec, parentMap, "heading")).toEqual([
      { id: "page", type: "Box" },
      { id: "stack", type: "Stack" },
    ]);
  });
});
