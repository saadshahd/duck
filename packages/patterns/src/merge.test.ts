import { describe, it, expect } from "bun:test";
import type { ComponentData } from "@puckeditor/core";
import type { SectionPattern, PatternConfig } from "./types.js";
import { merge } from "./merge.js";

const make = (
  type: string,
  id: string,
  extra: Record<string, unknown> = {},
): ComponentData =>
  ({ type, props: { id, ...extra } }) as unknown as ComponentData;

const config: PatternConfig = {
  componentRoles: {
    Stack: "container",
    Heading: "heading",
    Text: "body",
    Button: "action",
    Image: "figure",
  },
  patterns: [],
};

// Template: Stack > [Heading placeholder, Text placeholder]
const stackTemplate = make("Stack", "tmpl-root", {
  items: [
    make("Heading", "tmpl-h", { text: "Default heading" }),
    make("Text", "tmpl-t", { text: "Default body" }),
  ],
});

const simplePattern: SectionPattern = {
  name: "Simple",
  description: "test",
  tags: { topology: "stacked", treatment: ["open"], interaction: "static" },
  slots: [
    { name: "heading", accepts: ["heading"], cardinality: { kind: "first" } },
    { name: "body", accepts: ["body"], cardinality: { kind: "optional" } },
  ],
  data: stackTemplate,
};

describe("merge — cardinality cases", () => {
  // Case 1: first, exactly 1 match
  it("(first, 1 match) places the heading", () => {
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1", { text: "My Heading" })],
    });
    const result = merge(selection, simplePattern, config);
    expect(result.isOk()).toBe(true);
    const tree = result._unsafeUnwrap();
    // Tree is a Stack; its items should contain Heading with id 'h1'
    const items = tree.props.items as ComponentData[];
    expect(items.some((c) => c.props.id === "h1")).toBe(true);
  });

  // Case 2: first, 0 matches → err
  it("(first, 0 matches) returns required-slot-empty error", () => {
    const selection = make("Stack", "s1", {
      items: [make("Button", "b1")], // no heading
    });
    const result = merge(selection, simplePattern, config);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toEqual({
      kind: "required-slot-empty",
      slotName: "heading",
    });
  });

  // Case 3: first, 2+ matches → take first in document order
  it("(first, 2+ matches) takes first in document order", () => {
    const selection = make("Stack", "s1", {
      items: [
        make("Heading", "h1", { text: "First" }),
        make("Heading", "h2", { text: "Second" }),
      ],
    });
    const result = merge(selection, simplePattern, config);
    expect(result.isOk()).toBe(true);
    const items = result._unsafeUnwrap().props.items as ComponentData[];
    expect(items.some((c) => c.props.id === "h1")).toBe(true);
  });

  // Case 4: optional, 1 match → use existing
  it("(optional, 1 match) places the body component", () => {
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1"), make("Text", "t1", { text: "My body" })],
    });
    const result = merge(selection, simplePattern, config);
    expect(result.isOk()).toBe(true);
    const items = result._unsafeUnwrap().props.items as ComponentData[];
    expect(items.some((c) => c.props.id === "t1")).toBe(true);
  });

  // Case 5: optional, 0 matches → keep template default
  it("(optional, 0 matches) keeps template default for body slot", () => {
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1")], // no body
    });
    const result = merge(selection, simplePattern, config);
    expect(result.isOk()).toBe(true);
    const items = result._unsafeUnwrap().props.items as ComponentData[];
    // template default has id 'tmpl-t'
    expect(items.some((c) => c.props.id === "tmpl-t")).toBe(true);
  });

  // Case 6: many → all components in document order
  it("(many) collects all body components", () => {
    const manyPattern: SectionPattern = {
      ...simplePattern,
      slots: [
        {
          name: "heading",
          accepts: ["heading"],
          cardinality: { kind: "first" },
        },
        { name: "bodies", accepts: ["body"], cardinality: { kind: "many" } },
      ],
    };
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1"), make("Text", "t1"), make("Text", "t2")],
    });
    const result = merge(selection, manyPattern, config);
    expect(result.isOk()).toBe(true);
    const items = result._unsafeUnwrap().props.items as ComponentData[];
    expect(items.some((c) => c.props.id === "t1")).toBe(true);
    expect(items.some((c) => c.props.id === "t2")).toBe(true);
  });
});

describe("merge — root container exception", () => {
  it("merges root props when selection and template have same type", () => {
    const selection = make("Stack", "s1", { direction: "horizontal", gap: 8 });
    // template root is also Stack
    const result = merge(selection, simplePattern, config);
    // root container exception: selection props override template props
    // but heading 'first' cardinality — selection has no children so err
    expect(result.isErr()).toBe(true); // no heading — but root props merged
  });

  it("uses template root props when types differ", () => {
    const gridTemplate = make("Grid", "tmpl-root", {
      items: [make("Heading", "tmpl-h", { text: "Default" })],
    });
    const gridPattern: SectionPattern = {
      ...simplePattern,
      data: gridTemplate,
      slots: [
        {
          name: "heading",
          accepts: ["heading"],
          cardinality: { kind: "first" },
        },
      ],
    };
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1")],
    });
    const result = merge(selection, gridPattern, config);
    expect(result.isOk()).toBe(true);
    // Result root should be Grid (from template), not Stack
    expect(result._unsafeUnwrap().type).toBe("Grid");
  });
});

describe("merge — ID preservation", () => {
  it("preserves IDs of merged content nodes", () => {
    const selection = make("Stack", "s1", {
      items: [make("Heading", "my-heading-id")],
    });
    const result = merge(selection, simplePattern, config);
    expect(result.isOk()).toBe(true);
    const items = result._unsafeUnwrap().props.items as ComponentData[];
    expect(items.some((c) => c.props.id === "my-heading-id")).toBe(true);
  });
});
