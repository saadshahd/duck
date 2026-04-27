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

const run = <T>(effect: Effect.Effect<T, never>): T => Effect.runSync(effect);

const runEither = <E, T>(effect: Effect.Effect<T, E>) =>
  Effect.runSync(Effect.either(effect));

describe("applyOp - add", () => {
  it("inserts a top-level component when parentId is null", () => {
    const result = run(
      applyOp(
        seed(),
        {
          op: "add",
          parentId: null,
          slotKey: null,
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
          slotKey: "children",
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

  it("applies defaultProps and generates an id when missing", () => {
    const result = run(
      applyOp(
        seed(),
        {
          op: "add",
          parentId: "outer",
          slotKey: "children",
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
          slotKey: null,
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
          slotKey: "nope",
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
          slotKey: null,
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
          toSlotKey: "children",
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

  it("rejects circular moves", () => {
    const result = runEither(
      applyOp(
        seed(),
        {
          op: "move",
          id: "outer",
          toParentId: "outer",
          toSlotKey: "children",
          toIndex: 0,
        },
        config,
      ),
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left") expect(result.left.tag).toBe("circular-move");
  });

  it("rejects move into a descendant", () => {
    const nested: Data = {
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
        nested,
        {
          op: "move",
          id: "outer",
          toParentId: "inner",
          toSlotKey: "children",
          toIndex: 0,
        },
        config,
      ),
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left") expect(result.left.tag).toBe("circular-move");
  });
});
