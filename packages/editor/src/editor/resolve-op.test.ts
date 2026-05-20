import { describe, expect, test } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import type { ResolveOp, ResolveOpEmit } from "./types.js";
import { emitMoveResolveOp } from "./resolve-op.js";

type Emitted = {
  op: ResolveOp;
  entryId: string;
  data: Data;
};

const pushed = { status: "pushed", entryId: "entry" } as const;

const text = (id: string): ComponentData => ({
  type: "Text",
  props: { id },
});

const stack = (
  id: string,
  slots: Record<string, ComponentData[]>,
): ComponentData => ({
  type: "Stack",
  props: { id, ...slots },
});

const data = (...content: ComponentData[]): Data => ({
  root: { props: {} },
  content,
});

const collect = () => {
  let calls: Emitted[] = [];
  const emitOp: ResolveOpEmit = (op, entryId, nextData) => {
    calls = [...calls, { op, entryId, data: nextData }];
  };
  return {
    calls: () => calls,
    emitOp,
  };
};

const emit = ({
  beforeData,
  afterData,
  id,
}: {
  beforeData: Data;
  afterData: Data;
  id: string;
}): Emitted[] => {
  const emitted = collect();
  emitMoveResolveOp({
    result: pushed,
    emitOp: emitted.emitOp,
    id,
    beforeData,
    afterData,
  });
  return emitted.calls();
};

describe("emitMoveResolveOp", () => {
  test("does not emit for same parent and same slot reorder", () => {
    const beforeData = data(stack("parent", { items: [text("a"), text("b")] }));
    const afterData = data(stack("parent", { items: [text("b"), text("a")] }));

    expect(emit({ beforeData, afterData, id: "a" })).toEqual([]);
  });

  test("emits when parent changes", () => {
    const beforeData = data(
      stack("left", { items: [text("a")] }),
      stack("right", { items: [] }),
    );
    const afterData = data(
      stack("left", { items: [] }),
      stack("right", { items: [text("a")] }),
    );

    expect(emit({ beforeData, afterData, id: "a" })).toEqual([
      {
        op: { type: "move", id: "a", trigger: "move" },
        entryId: "entry",
        data: afterData,
      },
    ]);
  });

  test("emits when slot changes under the same parent", () => {
    const beforeData = data(stack("parent", { left: [text("a")], right: [] }));
    const afterData = data(stack("parent", { left: [], right: [text("a")] }));

    expect(emit({ beforeData, afterData, id: "a" })).toEqual([
      {
        op: { type: "move", id: "a", trigger: "move" },
        entryId: "entry",
        data: afterData,
      },
    ]);
  });

  test("does not emit for top-level reorder", () => {
    const beforeData = data(text("a"), text("b"));
    const afterData = data(text("b"), text("a"));

    expect(emit({ beforeData, afterData, id: "a" })).toEqual([]);
  });

  test("does not emit when either parent lookup is missing", () => {
    const beforeData = data(stack("parent", { items: [text("a")] }));
    const afterData = data(stack("parent", { items: [] }));

    expect(emit({ beforeData, afterData, id: "a" })).toEqual([]);
    expect(emit({ beforeData: afterData, afterData, id: "a" })).toEqual([]);
  });
});
