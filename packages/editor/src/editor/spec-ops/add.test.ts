import { describe, it, expect } from "bun:test";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { allIds } from "@duckeditor/spec";
import { add } from "./add.js";
import { findById } from "./helpers.js";

const config: Config = {
  components: {
    Stack: {
      defaultProps: { items: [] },
      fields: { items: { type: "slot" } },
      render: () => null as never,
    },
    Text: {
      defaultProps: { text: "default text" },
      fields: { text: { type: "text" } },
      render: () => null as never,
    },
    Button: {
      defaultProps: { label: "Click", variant: "primary" },
      fields: {
        label: { type: "text" },
        variant: { type: "select", options: [] },
      },
      render: () => null as never,
    },
  },
  root: { render: () => null as never },
} as Config;

const text = (id: string, t = "x"): ComponentData => ({
  type: "Text",
  props: { id, text: t },
});

const stack = (id: string, items: ComponentData[]): ComponentData => ({
  type: "Stack",
  props: { id, items },
});

const sample = (): Data => ({
  root: { props: {} },
  content: [stack("s1", [text("t1"), text("t2")])],
});

const empty = (): Data => ({ root: { props: {} }, content: [] });

describe("add — top-level (parentId=null, slotKey=null)", () => {
  it("appends to data.content when index undefined", () => {
    const result = add(
      empty(),
      { site: { at: "root" }, component: text("new") },
      config,
    );
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().content.map((c) => c.props.id)).toEqual([
      "new",
    ]);
  });

  it("inserts at index 0", () => {
    const result = add(
      sample(),
      { site: { at: "root" }, component: text("first"), index: 0 },
      config,
    );
    const ids = result._unsafeUnwrap().content.map((c) => c.props.id);
    expect(ids).toEqual(["first", "s1"]);
  });

  it("rejects index > length", () => {
    const result = add(
      sample(),
      { site: { at: "root" }, component: text("x"), index: 99 },
      config,
    );
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("index-out-of-bounds");
  });
});

describe("add — into a slot", () => {
  it("appends to a slot when index undefined", () => {
    const result = add(
      sample(),
      {
        site: { at: "slot", parentId: "s1", path: ["items"] },
        component: text("t3"),
      },
      config,
    );
    expect(result.isOk()).toBe(true);
    const next = result._unsafeUnwrap();
    const items = (findById(next, "s1")!.props.items as ComponentData[]).map(
      (c) => c.props.id,
    );
    expect(items).toEqual(["t1", "t2", "t3"]);
  });

  it("inserts at specified slot index", () => {
    const result = add(
      sample(),
      {
        site: { at: "slot", parentId: "s1", path: ["items"] },
        component: text("middle"),
        index: 1,
      },
      config,
    );
    const items = (
      findById(result._unsafeUnwrap(), "s1")!.props.items as ComponentData[]
    ).map((c) => c.props.id);
    expect(items).toEqual(["t1", "middle", "t2"]);
  });
});

describe("add — defaults and id generation", () => {
  it("merges component defaults under caller props", () => {
    const result = add(
      empty(),
      {
        site: { at: "root" },
        component: {
          type: "Button",
          props: { id: "b1", label: "Submit" },
        } as ComponentData,
      },
      config,
    );
    const next = findById(result._unsafeUnwrap(), "b1")!;
    expect(next.props).toEqual({
      label: "Submit",
      variant: "primary",
      id: "b1",
    });
  });

  it("initialises declared slot fields to []", () => {
    const result = add(
      empty(),
      {
        site: { at: "root" },
        component: { type: "Stack", props: { id: "s9" } } as ComponentData,
      },
      config,
    );
    const next = findById(result._unsafeUnwrap(), "s9")!;
    expect(next.props.items).toEqual([]);
  });

  it("generates an id when none is supplied", () => {
    const result = add(
      empty(),
      {
        site: { at: "root" },
        component: {
          type: "Text",
          props: { text: "hi" },
        } as unknown as ComponentData,
      },
      config,
    );
    const generated = result._unsafeUnwrap().content[0].props.id as string;
    expect(generated).toMatch(/^text-/);
  });

  it("preserves caller id when supplied", () => {
    const result = add(
      empty(),
      {
        site: { at: "root" },
        component: text("custom-id"),
      },
      config,
    );
    expect(result._unsafeUnwrap().content[0].props.id).toBe("custom-id");
  });
});

describe("add — slot allow/disallow enforcement", () => {
  const constrainedConfig: Config = {
    components: {
      Card: {
        defaultProps: { header: [], body: [] },
        fields: {
          header: { type: "slot", allow: ["Heading", "Text"] },
          body: { type: "slot" },
        },
        render: () => null as never,
      },
      Heading: {
        defaultProps: { text: "default" },
        fields: { text: { type: "text" } },
        render: () => null as never,
      },
      Text: {
        defaultProps: { text: "default text" },
        fields: { text: { type: "text" } },
        render: () => null as never,
      },
      Grid: {
        defaultProps: { children: [] },
        fields: { children: { type: "slot" } },
        render: () => null as never,
      },
    },
    root: { render: () => null as never },
  } as Config;

  const card = (id: string): ComponentData => ({
    type: "Card",
    props: { id, header: [], body: [] },
  });

  const withCard = (): Data => ({ root: { props: {} }, content: [card("c1")] });

  it("rejects a type not in the slot's allow list", () => {
    const result = add(
      withCard(),
      {
        site: { at: "slot", parentId: "c1", path: ["header"] },
        component: { type: "Grid", props: { id: "g1" } } as ComponentData,
      },
      constrainedConfig,
    );
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toEqual({
      tag: "disallowed-type",
      parentId: "c1",
      slotKey: "header",
      componentType: "Grid",
    });
  });

  it("accepts a type in the slot's allow list", () => {
    const result = add(
      withCard(),
      {
        site: { at: "slot", parentId: "c1", path: ["header"] },
        component: { type: "Heading", props: { id: "h1" } } as ComponentData,
      },
      constrainedConfig,
    );
    expect(result.isOk()).toBe(true);
  });

  it("allows any type into a bare slot with no allow/disallow", () => {
    const result = add(
      withCard(),
      {
        site: { at: "slot", parentId: "c1", path: ["body"] },
        component: { type: "Grid", props: { id: "g1" } } as ComponentData,
      },
      constrainedConfig,
    );
    expect(result.isOk()).toBe(true);
  });

  it("does not check constraints for a top-level (root) insert", () => {
    const result = add(
      withCard(),
      {
        site: { at: "root" },
        component: { type: "Grid", props: { id: "g1" } } as ComponentData,
      },
      constrainedConfig,
    );
    expect(result.isOk()).toBe(true);
  });
});

describe("add — errors", () => {
  it("parent-not-found when parentId missing", () => {
    const result = add(
      sample(),
      {
        site: { at: "slot", parentId: "zzz", path: ["items"] },
        component: text("x"),
      },
      config,
    );
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("parent-not-found");
  });

  it("slot-not-defined when slot is not an array on the parent", () => {
    const result = add(
      sample(),
      {
        site: { at: "slot", parentId: "t1", path: ["text"] },
        component: text("x"),
      },
      config,
    );
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("slot-not-defined");
  });

  it("index-out-of-bounds (negative)", () => {
    const result = add(
      sample(),
      {
        site: { at: "slot", parentId: "s1", path: ["items"] },
        component: text("x"),
        index: -1,
      },
      config,
    );
    expect(result._unsafeUnwrapErr().tag).toBe("index-out-of-bounds");
  });
});

describe("add — slot template re-minting", () => {
  const templateConfig: Config = {
    components: {
      Container: {
        defaultProps: {
          children: [{ type: "Text", props: { id: "", text: "default text" } }],
        },
        render: () => null as never,
      },
      Text: {
        defaultProps: { text: "default text" },
        render: () => null as never,
      },
    },
    root: { render: () => null as never },
  } as Config;

  const deepConfig: Config = {
    components: {
      Grid: {
        defaultProps: {
          children: [
            {
              type: "Card",
              props: {
                id: "",
                children: [
                  { type: "Text", props: { id: "", text: "card text" } },
                ],
              },
            },
          ],
        },
        render: () => null as never,
      },
      Card: { defaultProps: { children: [] }, render: () => null as never },
      Text: { defaultProps: { text: "x" }, render: () => null as never },
    },
    root: { render: () => null as never },
  } as Config;

  it("re-mints IDs of nested components from defaultProps", () => {
    const result = add(
      empty(),
      {
        site: { at: "root" },
        component: { type: "Container", props: {} } as unknown as ComponentData,
      },
      templateConfig,
    );
    const container = result._unsafeUnwrap().content[0];
    const child = (container.props.children as ComponentData[])[0];
    expect(child.props.id).toMatch(/^text-/);
  });

  it("produces unique child IDs when same container is inserted twice", () => {
    const first = add(
      empty(),
      {
        site: { at: "root" },
        component: { type: "Container", props: {} } as unknown as ComponentData,
      },
      templateConfig,
    )._unsafeUnwrap();
    const second = add(
      first,
      {
        site: { at: "root" },
        component: { type: "Container", props: {} } as unknown as ComponentData,
      },
      templateConfig,
    )._unsafeUnwrap();
    const id1 = (second.content[0].props.children as ComponentData[])[0].props
      .id as string;
    const id2 = (second.content[1].props.children as ComponentData[])[0].props
      .id as string;
    expect(id1).not.toBe("");
    expect(id2).not.toBe("");
    expect(id1).not.toBe(id2);
  });

  it("re-mints IDs recursively for deeply nested children", () => {
    const result = add(
      empty(),
      {
        site: { at: "root" },
        component: { type: "Grid", props: {} } as unknown as ComponentData,
      },
      deepConfig,
    );
    const grid = result._unsafeUnwrap().content[0];
    const card = (grid.props.children as ComponentData[])[0];
    const text = (card.props.children as ComponentData[])[0];
    expect(card.props.id).toMatch(/^card-/);
    expect(text.props.id).toMatch(/^text-/);
  });
});

describe("add — slot re-minting descends array-item slots", () => {
  // Card.features is an array of plain objects, each holding a nested "content"
  // slot — a slot reachable only via an array-item, not a top-level prop key.
  const arrayItemSlotConfig: Config = {
    components: {
      Card: {
        defaultProps: {
          features: [
            {
              content: [{ type: "Heading", props: { id: "h1", text: "hi" } }],
            },
          ],
        },
        render: () => null as never,
      },
      Heading: { defaultProps: { text: "x" }, render: () => null as never },
    },
    root: { render: () => null as never },
  } as Config;

  it("re-mints ids of components nested inside array-item slots", () => {
    const result = add(
      empty(),
      {
        site: { at: "root" },
        component: { type: "Card", props: {} } as unknown as ComponentData,
      },
      arrayItemSlotConfig,
    );
    const card = result._unsafeUnwrap().content[0];
    const features = card.props.features as { content: ComponentData[] }[];
    const heading = features[0].content[0];
    expect(heading.props.id).not.toBe("h1");
    expect(heading.props.id).toMatch(/^heading-/);
  });

  it("produces globally unique ids across the reminted subtree, twice over", () => {
    const first = add(
      empty(),
      {
        site: { at: "root" },
        component: { type: "Card", props: {} } as unknown as ComponentData,
      },
      arrayItemSlotConfig,
    )._unsafeUnwrap();
    const next = add(
      first,
      {
        site: { at: "root" },
        component: { type: "Card", props: {} } as unknown as ComponentData,
      },
      arrayItemSlotConfig,
    )._unsafeUnwrap();
    const ids = allIds(next);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("add — immutability", () => {
  it("does not mutate input data", () => {
    const original = sample();
    const snapshot = JSON.stringify(original);
    add(
      original,
      {
        site: { at: "slot", parentId: "s1", path: ["items"] },
        component: text("t3"),
      },
      config,
    );
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it("returns a new Data reference", () => {
    const original = sample();
    const result = add(
      original,
      {
        site: { at: "slot", parentId: "s1", path: ["items"] },
        component: text("t3"),
      },
      config,
    );
    expect(result._unsafeUnwrap()).not.toBe(original);
  });
});
