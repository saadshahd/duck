import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import type { Config, Data } from "@puckeditor/core";
import { applyOp, type Op } from "./ops.js";

const config = {
  components: {
    Box: {
      defaultProps: {},
      fields: { children: { type: "slot" } },
      render: () => null as never,
    },
    Sections: {
      defaultProps: { items: [] },
      fields: {
        items: {
          type: "array",
          arrayFields: {
            heading: { type: "text" },
            content: { type: "slot" },
          },
        },
      },
      render: () => null as never,
    },
    Text: {
      defaultProps: { text: "" },
      fields: { text: { type: "text" } },
      render: () => null as never,
    },
  },
} as unknown as Config;

const seed = (): Data => ({
  root: { props: {} },
  content: [
    {
      type: "Box",
      props: {
        id: "outer",
        children: [{ type: "Text", props: { id: "t1", text: "hi" } }],
      },
    },
  ],
});

/** A Sections node with one array item whose `content` slot holds `t-nested`. */
const nested = (): Data => ({
  root: { props: {} },
  content: [
    {
      type: "Sections",
      props: {
        id: "sec",
        items: [
          {
            heading: "One",
            content: [
              { type: "Text", props: { id: "t-nested", text: "deep" } },
            ],
          },
        ],
      },
    },
  ],
});

const run = <T>(effect: Effect.Effect<T, never>): T => Effect.runSync(effect);

const runEither = <E, T>(effect: Effect.Effect<T, E>) =>
  Effect.runSync(Effect.either(effect));

const itemsOf = (data: Data) =>
  (
    data.content[0]!.props as {
      items: Array<{ content: Array<{ props: { id: string } }> }>;
    }
  ).items;

describe("applyOp - add", () => {
  it("inserts a top-level component when parentId is null", () => {
    const result = run(
      applyOp(
        seed(),
        {
          op: "add",
          parentId: null,
          component: { type: "Text", props: { id: "new", text: "B" } },
        },
        config,
      ) as Effect.Effect<Data, never>,
    );
    expect(result.content).toHaveLength(2);
    expect((result.content[1]!.props as { id: string }).id).toBe("new");
  });

  it("inserts into a parent slot at the given index", () => {
    const result = run(
      applyOp(
        seed(),
        {
          op: "add",
          parentId: "outer",
          slotPath: ["children"],
          index: 0,
          component: { type: "Text", props: { id: "t0", text: "first" } },
        },
        config,
      ) as Effect.Effect<Data, never>,
    );
    const children = (
      result.content[0]!.props as { children: Array<{ props: { id: string } }> }
    ).children;
    expect(children.map((c) => c.props.id)).toEqual(["t0", "t1"]);
  });

  it("inserts into an array-item slot addressed by prop-path", () => {
    const result = run(
      applyOp(
        nested(),
        {
          op: "add",
          parentId: "sec",
          slotPath: ["items", 0, "content"],
          index: 0,
          component: { type: "Text", props: { id: "t-added", text: "x" } },
        },
        config,
      ) as Effect.Effect<Data, never>,
    );
    expect(itemsOf(result)[0]!.content.map((c) => c.props.id)).toEqual([
      "t-added",
      "t-nested",
    ]);
  });

  it("applies defaultProps and generates an id when missing", () => {
    const result = run(
      applyOp(
        seed(),
        {
          op: "add",
          parentId: "outer",
          slotPath: ["children"],
          component: {
            type: "Text",
            props: {} as Record<string, unknown>,
          } as never,
        },
        config,
      ) as Effect.Effect<Data, never>,
    );
    const children = (
      result.content[0]!.props as {
        children: Array<{ props: { id: string; text: string } }>;
      }
    ).children;
    expect(children).toHaveLength(2);
    expect(children[1]!.props.id).toMatch(/^Text-/);
    expect(children[1]!.props.text).toBe("");
  });

  it("rejects unknown component types", () => {
    const result = runEither(
      applyOp(
        seed(),
        {
          op: "add",
          parentId: null,
          component: { type: "Unknown", props: { id: "x" } },
        },
        config,
      ),
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left")
      expect(result.left.tag).toBe("unknown-component");
  });

  it("rejects undeclared slot keys", () => {
    const result = runEither(
      applyOp(
        seed(),
        {
          op: "add",
          parentId: "outer",
          slotPath: ["nope"],
          component: { type: "Text", props: { id: "x" } },
        },
        config,
      ),
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left")
      expect(result.left.tag).toBe("slot-not-defined");
  });

  it("rejects a slotPath that does not resolve to a slot", () => {
    const result = runEither(
      applyOp(
        nested(),
        {
          op: "add",
          parentId: "sec",
          slotPath: ["items", 5, "content"],
          component: { type: "Text", props: { id: "x" } },
        },
        config,
      ),
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left")
      expect(result.left.tag).toBe("slot-not-defined");
  });

  it("rejects a set parentId with no slotPath", () => {
    const result = runEither(
      applyOp(
        seed(),
        {
          op: "add",
          parentId: "outer",
          component: { type: "Text", props: { id: "x" } },
        },
        config,
      ),
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left")
      expect(result.left.tag).toBe("slot-not-defined");
  });

  it("rejects out-of-bounds index", () => {
    const result = runEither(
      applyOp(
        seed(),
        {
          op: "add",
          parentId: null,
          index: 99,
          component: { type: "Text", props: { id: "x" } },
        },
        config,
      ),
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left")
      expect(result.left.tag).toBe("index-out-of-bounds");
  });
});

describe("applyOp - update", () => {
  it("replaces props but pins id", () => {
    const result = run(
      applyOp(
        seed(),
        { op: "update", id: "t1", props: { text: "new" } },
        config,
      ) as Effect.Effect<Data, never>,
    );
    const t1 = (
      result.content[0]!.props as {
        children: Array<{ props: { id: string; text: string } }>;
      }
    ).children[0]!.props;
    expect(t1.id).toBe("t1");
    expect(t1.text).toBe("new");
  });

  it("preserves slot arrays when not provided in props", () => {
    const result = run(
      applyOp(
        seed(),
        { op: "update", id: "outer", props: {} },
        config,
      ) as Effect.Effect<Data, never>,
    );
    const outer = result.content[0]!.props as {
      children: Array<{ props: { id: string } }>;
    };
    expect(outer.children).toHaveLength(1);
  });

  it("fails for unknown id", () => {
    const result = runEither(
      applyOp(seed(), { op: "update", id: "nope", props: {} }, config),
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left")
      expect(result.left.tag).toBe("element-not-found");
  });
});

describe("applyOp - remove", () => {
  it("removes a top-level component", () => {
    const result = run(
      applyOp(seed(), { op: "remove", id: "outer" }, config) as Effect.Effect<
        Data,
        never
      >,
    );
    expect(result.content).toEqual([]);
  });

  it("removes a nested component", () => {
    const result = run(
      applyOp(seed(), { op: "remove", id: "t1" }, config) as Effect.Effect<
        Data,
        never
      >,
    );
    const children = (result.content[0]!.props as { children: unknown[] })
      .children;
    expect(children).toEqual([]);
  });

  it("removes a child from an array-item slot", () => {
    const result = run(
      applyOp(
        nested(),
        { op: "remove", id: "t-nested" },
        config,
      ) as Effect.Effect<Data, never>,
    );
    expect(itemsOf(result)[0]!.content).toEqual([]);
  });

  it("fails for unknown id", () => {
    const result = runEither(
      applyOp(seed(), { op: "remove", id: "nope" }, config),
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left")
      expect(result.left.tag).toBe("element-not-found");
  });
});

describe("applyOp - move", () => {
  const twoBoxes = (): Data => ({
    root: { props: {} },
    content: [
      { type: "Box", props: { id: "a", children: [] } },
      {
        type: "Box",
        props: {
          id: "b",
          children: [{ type: "Text", props: { id: "t", text: "hi" } }],
        },
      },
    ],
  });

  it("moves a component between slots", () => {
    const result = run(
      applyOp(
        twoBoxes(),
        {
          op: "move",
          id: "t",
          toParentId: "a",
          toSlotPath: ["children"],
          toIndex: 0,
        },
        config,
      ) as Effect.Effect<Data, never>,
    );
    const a = result.content[0]!.props as {
      children: Array<{ props: { id: string } }>;
    };
    const b = result.content[1]!.props as { children: unknown[] };
    expect(a.children.map((c) => c.props.id)).toEqual(["t"]);
    expect(b.children).toEqual([]);
  });

  it("moves a top-level child into an array-item slot", () => {
    const data: Data = {
      root: { props: {} },
      content: [
        ...nested().content,
        { type: "Text", props: { id: "t-top", text: "top" } },
      ],
    };
    const result = run(
      applyOp(
        data,
        {
          op: "move",
          id: "t-top",
          toParentId: "sec",
          toSlotPath: ["items", 0, "content"],
          toIndex: 1,
        },
        config,
      ) as Effect.Effect<Data, never>,
    );
    expect(result.content).toHaveLength(1);
    expect(itemsOf(result)[0]!.content.map((c) => c.props.id)).toEqual([
      "t-nested",
      "t-top",
    ]);
  });

  it("moves a child out of an array-item slot back to root", () => {
    const result = run(
      applyOp(
        nested(),
        {
          op: "move",
          id: "t-nested",
          toParentId: null,
          toIndex: 1,
        },
        config,
      ) as Effect.Effect<Data, never>,
    );
    expect(itemsOf(result)[0]!.content).toEqual([]);
    expect(result.content.map((c) => (c.props as { id: string }).id)).toEqual([
      "sec",
      "t-nested",
    ]);
  });

  it("rejects circular moves", () => {
    const result = runEither(
      applyOp(
        seed(),
        {
          op: "move",
          id: "outer",
          toParentId: "outer",
          toSlotPath: ["children"],
          toIndex: 0,
        },
        config,
      ),
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left") expect(result.left.tag).toBe("circular-move");
  });

  it("rejects move into a descendant", () => {
    const nestedBoxes: Data = {
      root: { props: {} },
      content: [
        {
          type: "Box",
          props: {
            id: "outer",
            children: [{ type: "Box", props: { id: "inner", children: [] } }],
          },
        },
      ],
    };
    const result = runEither(
      applyOp(
        nestedBoxes,
        {
          op: "move",
          id: "outer",
          toParentId: "inner",
          toSlotPath: ["children"],
          toIndex: 0,
        },
        config,
      ),
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left") expect(result.left.tag).toBe("circular-move");
  });
});
