import { describe, it, expect } from "bun:test";
import type { ComponentData } from "@puckeditor/core";
import type { PatternConfig, SectionPattern } from "./types.js";
import { collectTopLevel, isApplicable } from "./match.js";

// Factory helpers
const make = (
  type: string,
  id: string,
  extra: Record<string, unknown> = {},
): ComponentData =>
  ({ type, props: { id, ...extra } }) as unknown as ComponentData;

const config: PatternConfig = {
  componentRoles: {
    Stack: "container",
    Card: "container",
    Image: "figure",
    Heading: "heading",
    Text: "body",
    Button: "action",
  },
  patterns: [],
};

// A minimal pattern for testing
const splitPattern: SectionPattern = {
  name: "Split hero",
  description: "desc",
  tags: { topology: "split", treatment: ["full-bleed"], interaction: "static" },
  appliesTo: ["Stack"],
  slots: [
    { name: "figure", accepts: ["figure"], cardinality: { kind: "optional" } },
    { name: "heading", accepts: ["heading"], cardinality: { kind: "first" } },
    { name: "body", accepts: ["body"], cardinality: { kind: "optional" } },
    { name: "action", accepts: ["action"], cardinality: { kind: "optional" } },
  ],
  data: make("Stack", "template"),
};

const headingOnlyPattern: SectionPattern = {
  name: "Text only",
  description: "desc",
  tags: { topology: "stacked", treatment: ["open"], interaction: "static" },
  appliesTo: ["Stack"],
  slots: [
    { name: "heading", accepts: ["heading"], cardinality: { kind: "first" } },
  ],
  data: make("Stack", "template"),
};

describe("collectTopLevel", () => {
  it("returns empty array for component with no slot children", () => {
    const stack = make("Stack", "s1");
    expect(collectTopLevel(stack, config.componentRoles)).toEqual([]);
  });

  it("returns direct content children", () => {
    const heading = make("Heading", "h1");
    const stack = make("Stack", "s1", { items: [heading] });
    const result = collectTopLevel(stack, config.componentRoles);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Heading");
  });

  it("recurses into container children", () => {
    const heading = make("Heading", "h1");
    const card = make("Card", "c1", { items: [heading] });
    const stack = make("Stack", "s1", { items: [card] });
    // Card is container so we recurse — find Heading inside it
    const result = collectTopLevel(stack, config.componentRoles);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Heading");
  });

  it("does not recurse into figure children (figure is opaque)", () => {
    const heading = make("Heading", "h1");
    const image = make("Image", "img1", { items: [heading] });
    const stack = make("Stack", "s1", { items: [image] });
    // Image is figure — opaque, do not look inside
    const result = collectTopLevel(stack, config.componentRoles);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Image");
  });

  it("preserves document order", () => {
    const h1 = make("Heading", "h1");
    const t1 = make("Text", "t1");
    const b1 = make("Button", "b1");
    const stack = make("Stack", "s1", { items: [h1, t1, b1] });
    const result = collectTopLevel(stack, config.componentRoles);
    expect(result.map((c) => c.type)).toEqual(["Heading", "Text", "Button"]);
  });

  it("flattens deeply nested containers", () => {
    const heading = make("Heading", "h1");
    const inner = make("Stack", "s2", { items: [heading] });
    const outer = make("Stack", "s1", { items: [inner] });
    const result = collectTopLevel(outer, config.componentRoles);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Heading");
  });

  it("finds children in any prop field that holds an array", () => {
    const heading = make("Heading", "h1");
    // children in 'content' prop instead of 'items'
    const stack = make("Stack", "s1", { content: [heading] });
    const result = collectTopLevel(stack, config.componentRoles);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Heading");
  });
});

describe("isApplicable", () => {
  it("returns false when fingerprint not in appliesTo", () => {
    const grid = make("Grid", "g1", { items: [make("Heading", "h1")] });
    const gridConfig: PatternConfig = {
      ...config,
      componentRoles: { ...config.componentRoles, Grid: "container" },
    };
    expect(isApplicable(grid, splitPattern, gridConfig)).toBe(false);
  });

  it("returns true when all conditions met", () => {
    const stack = make("Stack", "s1", {
      items: [make("Heading", "h1")],
    });
    expect(isApplicable(stack, splitPattern, config)).toBe(true);
  });

  it("returns false when required 'first' slot has no matching component", () => {
    // splitPattern has 'heading' as 'first' — if no heading present, fails
    const stack = make("Stack", "s1", {
      items: [make("Button", "b1")],
    });
    expect(isApplicable(stack, splitPattern, config)).toBe(false);
  });

  it("returns true for optional slots even with no matching component", () => {
    // splitPattern has figure as optional — stack with only heading should still match
    const stack = make("Stack", "s1", {
      items: [make("Heading", "h1")],
    });
    expect(isApplicable(stack, splitPattern, config)).toBe(true);
  });

  it("returns false when selection has figure but pattern has no figure slot", () => {
    // headingOnlyPattern has no figure slot
    // stack with image — lossless invariant: must reject
    const stack = make("Stack", "s1", {
      items: [make("Image", "img1"), make("Heading", "h1")],
    });
    expect(isApplicable(stack, headingOnlyPattern, config)).toBe(false);
  });

  it("returns true when selection has figure and pattern has figure slot", () => {
    const stack = make("Stack", "s1", {
      items: [make("Image", "img1"), make("Heading", "h1")],
    });
    expect(isApplicable(stack, splitPattern, config)).toBe(true);
  });

  it("handles 'many' cardinality — requires at least one match", () => {
    const manyPattern: SectionPattern = {
      ...splitPattern,
      slots: [
        { name: "items", accepts: ["body"], cardinality: { kind: "many" } },
      ],
    };
    const withBody = make("Stack", "s1", { items: [make("Text", "t1")] });
    const withoutBody = make("Stack", "s1", { items: [make("Button", "b1")] });
    expect(isApplicable(withBody, manyPattern, config)).toBe(true);
    expect(isApplicable(withoutBody, manyPattern, config)).toBe(false);
  });

  it("handles 'any' cardinality — always satisfied", () => {
    const anyPattern: SectionPattern = {
      ...splitPattern,
      slots: [
        { name: "items", accepts: ["body"], cardinality: { kind: "any" } },
      ],
    };
    const empty = make("Stack", "s1");
    expect(isApplicable(empty, anyPattern, config)).toBe(true);
  });
});
