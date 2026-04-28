import { describe, it, expect } from "bun:test";
import type { ComponentData, Config } from "@puckeditor/core";
import type { PatternConfig, SectionPattern } from "./types.js";
import { createPatternRegistry } from "./registry.js";

const make = (
  type: string,
  id: string,
  extra: Record<string, unknown> = {},
): ComponentData =>
  ({ type, props: { id, ...extra } }) as unknown as ComponentData;

// Minimal puck config with layout-intent fields for derive
const puckConfig: Config = {
  components: {
    Stack: {
      render: () => null as any,
      defaultProps: { direction: "vertical" },
      fields: {
        direction: {
          type: "select",
          options: [
            { label: "Horizontal", value: "horizontal" },
            { label: "Vertical", value: "vertical" },
          ],
        },
      },
    },
    Heading: { render: () => null as any },
    Text: { render: () => null as any },
    Image: { render: () => null as any },
    Button: { render: () => null as any },
  },
  root: { render: () => null as any },
} as unknown as Config;

const templateRoot = make("Stack", "tmpl", {
  items: [
    make("Heading", "tmpl-h", { text: "Default heading" }),
    make("Text", "tmpl-t", { text: "Default body" }),
  ],
});

const splitPattern: SectionPattern = {
  name: "Split hero",
  description: "Horizontal split",
  tags: { topology: "split", treatment: ["full-bleed"], interaction: "static" },
  appliesTo: ["Stack"],
  slots: [
    { name: "heading", accepts: ["heading"], cardinality: { kind: "first" } },
    { name: "body", accepts: ["body"], cardinality: { kind: "optional" } },
  ],
  data: templateRoot,
};

const cardPattern: SectionPattern = {
  name: "Card layout",
  description: "Card with image",
  tags: { topology: "stacked", treatment: ["framed"], interaction: "static" },
  appliesTo: ["Stack"],
  slots: [
    { name: "figure", accepts: ["figure"], cardinality: { kind: "optional" } },
    { name: "heading", accepts: ["heading"], cardinality: { kind: "first" } },
  ],
  data: make("Stack", "card-tmpl", {
    items: [
      make("Image", "card-img", {}),
      make("Heading", "card-h", { text: "Card heading" }),
    ],
  }),
};

const patternConfig: PatternConfig = {
  componentRoles: {
    Stack: "container",
    Heading: "heading",
    Text: "body",
    Image: "figure",
    Button: "action",
  },
  patterns: [splitPattern, cardPattern],
};

describe("createPatternRegistry", () => {
  const registry = createPatternRegistry(puckConfig, patternConfig);

  describe("findApplicable", () => {
    it("returns patterns matching selection fingerprint and applicability", () => {
      const selection = make("Stack", "s1", {
        items: [make("Heading", "h1")],
      });
      const result = registry.findApplicable(selection);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((p) => p.name === "Split hero")).toBe(true);
    });

    it("returns empty when no patterns apply", () => {
      const selection = make("Grid", "g1");
      const result = registry.findApplicable(selection);
      expect(result).toEqual([]);
    });

    it("excludes patterns that fail lossless invariant (figure in selection, no figure slot)", () => {
      // splitPattern has no figure slot — selection with Image should not match
      const selection = make("Stack", "s1", {
        items: [make("Image", "img1"), make("Heading", "h1")],
      });
      const result = registry.findApplicable(selection);
      // splitPattern excluded; cardPattern included (has figure slot)
      expect(result.every((p) => p.name !== "Split hero")).toBe(true);
      expect(result.some((p) => p.name === "Card layout")).toBe(true);
    });

    it("returns multiple patterns when all apply", () => {
      // Both patterns apply: heading present, no figure
      const selection = make("Stack", "s1", {
        items: [make("Heading", "h1"), make("Text", "t1")],
      });
      const result = registry.findApplicable(selection);
      // cardPattern has optional figure — should still apply without one
      // splitPattern has required heading — present, should apply
      expect(result.length).toBe(2);
    });
  });

  describe("count", () => {
    it("returns number of applicable patterns", () => {
      const selection = make("Stack", "s1", {
        items: [make("Heading", "h1")],
      });
      expect(registry.count(selection)).toBe(
        registry.findApplicable(selection).length,
      );
    });

    it("returns 0 when no patterns apply", () => {
      const selection = make("Box", "b1");
      expect(registry.count(selection)).toBe(0);
    });
  });

  describe("apply", () => {
    it("returns Ok with merged ComponentData", () => {
      const selection = make("Stack", "s1", {
        items: [make("Heading", "h1", { text: "Hello" })],
      });
      const result = registry.apply(selection, splitPattern);
      expect(result.isOk()).toBe(true);
      const tree = result._unsafeUnwrap();
      expect(tree.type).toBe("Stack");
    });

    it("returns Err when required slot has no match", () => {
      const selection = make("Stack", "s1", {
        items: [make("Button", "b1")], // no heading
      });
      const result = registry.apply(selection, splitPattern);
      expect(result.isErr()).toBe(true);
    });
  });

  describe("derive", () => {
    it("returns derived variations for component with layout fields", () => {
      const variations = registry.derive("Stack");
      expect(variations.length).toBeGreaterThan(0);
      expect(variations.some((v) => v.name === "Horizontal")).toBe(true);
      expect(variations[0].componentType).toBe("Stack");
    });

    it("returns empty array for component without layout fields", () => {
      const variations = registry.derive("Heading");
      expect(variations).toEqual([]);
    });

    it("returns empty array for unknown component type", () => {
      const variations = registry.derive("Unknown");
      expect(variations).toEqual([]);
    });
  });
});
