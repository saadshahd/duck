import { describe, it, expect } from "bun:test";
import type { ComponentData, Config, Data } from "@puckeditor/core";
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
      fields: { label: { type: "text" }, variant: { type: "select", options: [] } },
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
      { parentId: null, slotKey: null, component: text("new") },
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
      { parentId: null, slotKey: null, component: text("first"), index: 0 },
      config,
    );
    const ids = result._unsafeUnwrap().content.map((c) => c.props.id);
    expect(ids).toEqual(["first", "s1"]);
  });

  it("rejects index > length", () => {
    const result = add(
      sample(),
      { parentId: null, slotKey: null, component: text("x"), index: 99 },
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
      { parentId: "s1", slotKey: "items", component: text("t3") },
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
        parentId: "s1",
        slotKey: "items",
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
        parentId: null,
        slotKey: null,
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
        parentId: null,
        slotKey: null,
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
        parentId: null,
        slotKey: null,
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
        parentId: null,
        slotKey: null,
        component: text("custom-id"),
      },
      config,
    );
    expect(result._unsafeUnwrap().content[0].props.id).toBe("custom-id");
  });
});

describe("add — errors", () => {
  it("parent-not-found when parentId missing", () => {
    const result = add(
      sample(),
      { parentId: "zzz", slotKey: "items", component: text("x") },
      config,
    );
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("parent-not-found");
  });

  it("slot-not-defined when slot is not an array on the parent", () => {
    const result = add(
      sample(),
      { parentId: "t1", slotKey: "text", component: text("x") },
      config,
    );
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("slot-not-defined");
  });

  it("index-out-of-bounds (negative)", () => {
    const result = add(
      sample(),
      { parentId: "s1", slotKey: "items", component: text("x"), index: -1 },
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
      Text: { defaultProps: { text: "default text" }, render: () => null as never },
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
        parentId: null,
        slotKey: null,
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
        parentId: null,
        slotKey: null,
        component: { type: "Container", props: {} } as unknown as ComponentData,
      },
      templateConfig,
    )._unsafeUnwrap();
    const second = add(
      first,
      {
        parentId: null,
        slotKey: null,
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
        parentId: null,
        slotKey: null,
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

describe("add — immutability", () => {
  it("does not mutate input data", () => {
    const original = sample();
    const snapshot = JSON.stringify(original);
    add(
      original,
      { parentId: "s1", slotKey: "items", component: text("t3") },
      config,
    );
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it("returns a new Data reference", () => {
    const original = sample();
    const result = add(
      original,
      { parentId: "s1", slotKey: "items", component: text("t3") },
      config,
    );
    expect(result._unsafeUnwrap()).not.toBe(original);
  });
});
