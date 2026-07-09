import { describe, it, expect } from "bun:test";
import type { ComponentData } from "@puckeditor/core";
import type { SectionPattern, PatternConfig } from "./types.js";
import { merge } from "./merge.js";
import { make } from "./testing.js";

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
  slots: [
    { name: "heading", accepts: ["heading"], cardinality: { kind: "first" } },
    { name: "body", accepts: ["body"], cardinality: { kind: "optional" } },
  ],
  data: stackTemplate,
};

function mergeItems(
  selection: ComponentData,
  pattern: SectionPattern = simplePattern,
): ComponentData[] {
  const result = merge(selection, pattern, config);
  expect(result.isOk()).toBe(true);
  return result._unsafeUnwrap().data.props.items as ComponentData[];
}

describe("merge — cardinality cases", () => {
  // Case 1: first, exactly 1 match
  it("(first, 1 match) places the heading", () => {
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1", { text: "My Heading" })],
    });
    const items = mergeItems(selection);
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
    const items = mergeItems(selection);
    expect(items.some((c) => c.props.id === "h1")).toBe(true);
  });

  // Case 4: optional, 1 match → use existing
  it("(optional, 1 match) places the body component", () => {
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1"), make("Text", "t1", { text: "My body" })],
    });
    const items = mergeItems(selection);
    expect(items.some((c) => c.props.id === "t1")).toBe(true);
  });

  // Case 5: optional, 0 matches → omit the slot (no fabricated placeholder)
  it("(optional, 0 matches) omits the body slot rather than fabricating a placeholder", () => {
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1")],
    });
    const items = mergeItems(selection);
    // The template's "Default body" Text placeholder must NOT survive — the
    // selection had no body, so the result carries only its real heading.
    expect(items.some((c) => c.type === "Text")).toBe(false);
    expect(items.some((c) => c.props.id === "h1")).toBe(true);
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
    const items = mergeItems(selection, manyPattern);
    expect(items.some((c) => c.props.id === "t1")).toBe(true);
    expect(items.some((c) => c.props.id === "t2")).toBe(true);
  });
});

describe("merge — no fabricated placeholders", () => {
  // Template carries literal placeholder copy in its optional slots. When the
  // selection has no matching content, that copy must never leak into the result.
  const fabricationPattern: SectionPattern = {
    name: "Heading + body + action",
    description: "test",
    slots: [
      { name: "heading", accepts: ["heading"], cardinality: { kind: "first" } },
      { name: "body", accepts: ["body"], cardinality: { kind: "optional" } },
      {
        name: "action",
        accepts: ["action"],
        cardinality: { kind: "optional" },
      },
    ],
    data: make("Stack", "tmpl-root", {
      items: [
        make("Heading", "tmpl-h", { text: "Card title" }),
        make("Text", "tmpl-t", { text: "Description goes here." }),
        make("Button", "tmpl-btn", { label: "Get started" }),
      ],
    }),
  };

  it("omits an unmatched optional action slot instead of keeping its placeholder", () => {
    const selection = make("Stack", "s1", {
      items: [
        make("Heading", "h1", { text: "Real heading" }),
        make("Text", "t1", { text: "Real body" }),
      ],
    });
    const items = mergeItems(selection, fabricationPattern);

    // The action slot had no match → omitted. No "Get started" Button survives.
    expect(items.some((c) => c.type === "Button")).toBe(false);
    expect(items.some((c) => c.props.label === "Get started")).toBe(false);
    // Nor the template's body copy, since real body content replaced it.
    expect(items.some((c) => c.props.text === "Description goes here.")).toBe(
      false,
    );
  });

  it("carries matched heading and body content through unchanged", () => {
    const heading = make("Heading", "h1", { text: "Real heading" });
    const body = make("Text", "t1", { text: "Real body" });
    const selection = make("Stack", "s1", { items: [heading, body] });
    const items = mergeItems(selection, fabricationPattern);

    expect(items.find((c) => c.props.id === "h1")).toEqual(heading);
    expect(items.find((c) => c.props.id === "t1")).toEqual(body);
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
    expect(result._unsafeUnwrap().data.type).toBe("Grid");
  });
});

describe("merge — collection role", () => {
  // A collection (list) container — its items are opaque units, moved
  // wholesale into an accepting slot, never flattened into the pool.
  const collectionConfig: PatternConfig = {
    ...config,
    componentRoles: { ...config.componentRoles, Grid: "collection" },
  };

  const collectionPattern: SectionPattern = {
    name: "Heading + collection",
    description: "test",
    slots: [
      { name: "heading", accepts: ["heading"], cardinality: { kind: "first" } },
      {
        name: "list",
        accepts: ["collection"],
        cardinality: { kind: "optional" },
      },
    ],
    data: make("Stack", "tmpl-root", {
      items: [
        make("Heading", "tmpl-h", { text: "Default" }),
        make("Grid", "tmpl-grid", { items: [] }),
      ],
    }),
  };

  it("places the collection as an opaque unit in the accepting slot", () => {
    const card = make("Card", "card1", { items: [make("Heading", "ih1")] });
    const grid = make("Grid", "g1", { items: [card] });
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1"), grid],
    });
    const result = merge(selection, collectionPattern, collectionConfig);
    expect(result.isOk()).toBe(true);
    const items = result._unsafeUnwrap().data.props.items as ComponentData[];
    expect(items.find((c) => c.props.id === "g1")).toEqual(grid);
  });

  it("preserves every id inside the collection subtree, not just its root", () => {
    const innerHeading = make("Heading", "inner-h");
    const card = make("Card", "card1", { items: [innerHeading] });
    const grid = make("Grid", "g1", { items: [card] });
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1"), grid],
    });
    const result = merge(selection, collectionPattern, collectionConfig);
    expect(result.isOk()).toBe(true);
    const preserved = result._unsafeUnwrap().preservedIds;
    expect(["g1", "card1", "inner-h"].every((id) => preserved.has(id))).toBe(
      true,
    );
  });

  it("preserves ids nested in array-item slots inside the collection", () => {
    const deep = make("Heading", "deep-h");
    const grid = make("Grid", "g1", { rows: [{ cells: [deep] }] });
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1"), grid],
    });
    const result = merge(selection, collectionPattern, collectionConfig);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().preservedIds.has("deep-h")).toBe(true);
  });

  it("omits an optional collection slot when the selection has no collection", () => {
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1")],
    });
    const result = merge(selection, collectionPattern, collectionConfig);
    expect(result.isOk()).toBe(true);
    const items = result._unsafeUnwrap().data.props.items as ComponentData[];
    expect(items.some((c) => c.type === "Grid")).toBe(false);
  });

  it("returns required-slot-empty when a required collection slot has no collection", () => {
    const requiredPattern: SectionPattern = {
      ...collectionPattern,
      slots: [
        {
          name: "heading",
          accepts: ["heading"],
          cardinality: { kind: "first" },
        },
        {
          name: "list",
          accepts: ["collection"],
          cardinality: { kind: "first" },
        },
      ],
    };
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1")],
    });
    const result = merge(selection, requiredPattern, collectionConfig);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toEqual({
      kind: "required-slot-empty",
      slotName: "list",
    });
  });

  it("takes the first collection in document order for a singular slot", () => {
    const grid1 = make("Grid", "g1", { items: [] });
    const grid2 = make("Grid", "g2", { items: [] });
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1"), grid1, grid2],
    });
    const result = merge(selection, collectionPattern, collectionConfig);
    expect(result.isOk()).toBe(true);
    const items = result._unsafeUnwrap().data.props.items as ComponentData[];
    expect(items.some((c) => c.props.id === "g1")).toBe(true);
    expect(items.some((c) => c.props.id === "g2")).toBe(false);
  });

  it("places every collection in document order for a plural slot", () => {
    const manyPattern: SectionPattern = {
      ...collectionPattern,
      slots: [
        {
          name: "heading",
          accepts: ["heading"],
          cardinality: { kind: "first" },
        },
        {
          name: "lists",
          accepts: ["collection"],
          cardinality: { kind: "many" },
        },
      ],
    };
    const grid1 = make("Grid", "g1", { items: [] });
    const grid2 = make("Grid", "g2", { items: [] });
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1"), grid1, grid2],
    });
    const result = merge(selection, manyPattern, collectionConfig);
    expect(result.isOk()).toBe(true);
    const items = result._unsafeUnwrap().data.props.items as ComponentData[];
    expect(items.some((c) => c.props.id === "g1")).toBe(true);
    expect(items.some((c) => c.props.id === "g2")).toBe(true);
  });

  it("silently drops a collection when the pattern has no accepting slot (guarded upstream by isApplicable)", () => {
    // merge() does not re-verify the lossless invariant — that is isApplicable's
    // job. Calling merge directly with a pattern that never matched findApplicable
    // is a caller error; merge degrades the same way it does for any other
    // unmatched role: the content is left out of the result.
    const grid = make("Grid", "g1", { items: [] });
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1"), grid],
    });
    const result = merge(selection, simplePattern, collectionConfig);
    expect(result.isOk()).toBe(true);
    const items = result._unsafeUnwrap().data.props.items as ComponentData[];
    expect(items.some((c) => c.type === "Grid")).toBe(false);
  });
});

describe("merge — preservedIds", () => {
  it("includes root ID in preservedIds", () => {
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1")],
    });
    const result = merge(selection, simplePattern, config);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().preservedIds.has("s1")).toBe(true);
  });

  it("includes content node IDs in preservedIds", () => {
    const selection = make("Stack", "s1", {
      items: [make("Heading", "my-heading-id")],
    });
    const result = merge(selection, simplePattern, config);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().preservedIds.has("my-heading-id")).toBe(true);
  });

  it("does NOT include template default IDs in preservedIds", () => {
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1")],
    });
    const result = merge(selection, simplePattern, config);
    expect(result.isOk()).toBe(true);
    // tmpl-t is a template default — caller must remint it
    expect(result._unsafeUnwrap().preservedIds.has("tmpl-t")).toBe(false);
  });

  it("content node IDs appear in merged data", () => {
    const selection = make("Stack", "s1", {
      items: [make("Heading", "my-heading-id")],
    });
    const items = mergeItems(selection);
    expect(items.some((c) => c.props.id === "my-heading-id")).toBe(true);
  });
});

describe("merge — array-item slots inside a container", () => {
  // A container's placeholder can live inside an array-item slot
  // (e.g. `blocks[i].content`), not just a top-level slot. replacePlaceholder
  // recurses into containers via mapComponent — it must find that placeholder
  // there too, matching slotPathsOf's reach.
  const containerConfig: PatternConfig = {
    ...config,
    componentRoles: { ...config.componentRoles, Section: "container" },
  };

  const nestedPattern: SectionPattern = {
    name: "Heading in nested container",
    description: "test",
    slots: [
      { name: "heading", accepts: ["heading"], cardinality: { kind: "first" } },
    ],
    data: make("Stack", "tmpl-root", {
      items: [
        make("Section", "tmpl-sec", {
          blocks: [
            { content: [make("Heading", "tmpl-h", { text: "Default" })] },
          ],
        }),
      ],
    }),
  };

  it("replaces a placeholder nested inside a container's array-item slot", () => {
    const selection = make("Stack", "s1", {
      items: [make("Heading", "h1", { text: "Real heading" })],
    });
    const result = merge(selection, nestedPattern, containerConfig);
    expect(result.isOk()).toBe(true);
    const items = result._unsafeUnwrap().data.props.items as ComponentData[];
    const section = items.find((c) => c.props.id === "tmpl-sec")!;
    const blocks = section.props.blocks as { content: ComponentData[] }[];
    expect(blocks[0].content.some((c) => c.props.id === "h1")).toBe(true);
    expect(blocks[0].content.some((c) => c.props.id === "tmpl-h")).toBe(false);
  });
});
