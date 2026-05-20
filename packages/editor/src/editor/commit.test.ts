import { describe, expect, test } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import type {
  DataCommit,
  DataPush,
  DataPushResult,
  ResolveOp,
  ResolveOpEmit,
  ResolvePlan,
} from "./types.js";
import { commitData, resolvePlanToOp } from "./commit.js";

type Emitted = {
  op: ResolveOp;
  entryId: string;
  data: Data;
};

type Pushed = {
  data: Data;
  label: string;
  group?: string;
};

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

const resolve = ({
  beforeData = data(),
  afterData = data(),
  plan,
}: {
  beforeData?: Data;
  afterData?: Data;
  plan: ResolvePlan;
}): ResolveOp | null => resolvePlanToOp({ plan, beforeData, afterData });

const commit = ({
  beforeData = data(),
  afterData = data(text("a")),
  label = "Changed",
  group,
  resolve = { kind: "update", id: "a" },
}: Partial<DataCommit> & { resolve?: ResolvePlan } = {}): DataCommit => ({
  beforeData,
  afterData,
  label,
  ...(group !== undefined && { group }),
  resolve,
});

const collect = (result: DataPushResult) => {
  let emitted: Emitted[] = [];
  let pushed: Pushed[] = [];
  const push: DataPush = (nextData, label, group) => {
    pushed = [
      ...pushed,
      { data: nextData, label, ...(group !== undefined && { group }) },
    ];
    return result;
  };
  const emitOp: ResolveOpEmit = (op, entryId, nextData) => {
    emitted = [...emitted, { op, entryId, data: nextData }];
  };
  return {
    emitted: () => emitted,
    pushed: () => pushed,
    push,
    emitOp,
  };
};

describe("resolvePlanToOp", () => {
  test("maps direct resolver plans", () => {
    expect(resolve({ plan: { kind: "none" } })).toBeNull();
    expect(resolve({ plan: { kind: "insert", id: "a" } })).toEqual({
      type: "insert",
      id: "a",
      trigger: "insert",
    });
    expect(resolve({ plan: { kind: "update", id: "a" } })).toEqual({
      type: "update",
      id: "a",
      trigger: "replace",
    });
    expect(resolve({ plan: { kind: "morph", id: "a" } })).toEqual({
      type: "morph",
      id: "a",
      trigger: "replace",
    });
    expect(resolve({ plan: { kind: "remove", ids: ["a", "b"] } })).toEqual({
      type: "remove",
      ids: ["a", "b"],
    });
    expect(resolve({ plan: { kind: "force", ids: ["a", "b"] } })).toEqual({
      type: "force",
      ids: ["a", "b"],
      trigger: "force",
    });
  });

  test("does not emit moves for same parent and same slot reorder", () => {
    const beforeData = data(stack("parent", { items: [text("a"), text("b")] }));
    const afterData = data(stack("parent", { items: [text("b"), text("a")] }));

    expect(
      resolve({ beforeData, afterData, plan: { kind: "move", id: "a" } }),
    ).toBeNull();
  });

  test("emits moves when parent changes", () => {
    const beforeData = data(
      stack("left", { items: [text("a")] }),
      stack("right", { items: [] }),
    );
    const afterData = data(
      stack("left", { items: [] }),
      stack("right", { items: [text("a")] }),
    );

    expect(
      resolve({ beforeData, afterData, plan: { kind: "move", id: "a" } }),
    ).toEqual({ type: "move", id: "a", trigger: "move" });
  });

  test("emits moves when slot changes under the same parent", () => {
    const beforeData = data(stack("parent", { left: [text("a")], right: [] }));
    const afterData = data(stack("parent", { left: [], right: [text("a")] }));

    expect(
      resolve({ beforeData, afterData, plan: { kind: "move", id: "a" } }),
    ).toEqual({ type: "move", id: "a", trigger: "move" });
  });

  test("does not emit moves for top-level reorder", () => {
    const beforeData = data(text("a"), text("b"));
    const afterData = data(text("b"), text("a"));

    expect(
      resolve({ beforeData, afterData, plan: { kind: "move", id: "a" } }),
    ).toBeNull();
  });

  test("does not emit moves when either parent lookup is missing", () => {
    const beforeData = data(stack("parent", { items: [text("a")] }));
    const afterData = data(stack("parent", { items: [] }));

    expect(
      resolve({ beforeData, afterData, plan: { kind: "move", id: "a" } }),
    ).toBeNull();
    expect(
      resolve({
        beforeData: afterData,
        afterData,
        plan: { kind: "move", id: "a" },
      }),
    ).toBeNull();
  });

  test("returns null for malformed runtime plans", () => {
    expect(
      resolve({ plan: { kind: "invalid", id: "a" } as unknown as ResolvePlan }),
    ).toBeNull();
  });
});

describe("commitData", () => {
  test("pushes the data snapshot and returns the push result", () => {
    const result = { status: "pushed", entryId: "entry" } as const;
    const collected = collect(result);
    const next = data(text("a"));

    expect(
      commitData({
        commit: commit({ afterData: next, label: "Changed title", group: "g" }),
        push: collected.push,
        emitOp: collected.emitOp,
      }),
    ).toBe(result);

    expect(collected.pushed()).toEqual([
      { data: next, label: "Changed title", group: "g" },
    ]);
  });

  test("emits resolver ops for pushed and coalesced results", () => {
    const pushed = collect({ status: "pushed", entryId: "pushed" });
    const coalesced = collect({ status: "coalesced", entryId: "coalesced" });
    const next = data(text("a"));

    commitData({
      commit: commit({ afterData: next }),
      push: pushed.push,
      emitOp: pushed.emitOp,
    });
    commitData({
      commit: commit({ afterData: next }),
      push: coalesced.push,
      emitOp: coalesced.emitOp,
    });

    expect(pushed.emitted()).toEqual([
      {
        op: { type: "update", id: "a", trigger: "replace" },
        entryId: "pushed",
        data: next,
      },
    ]);
    expect(coalesced.emitted()).toEqual([
      {
        op: { type: "update", id: "a", trigger: "replace" },
        entryId: "coalesced",
        data: next,
      },
    ]);
  });

  test("does not plan resolver ops for collapsed or unchanged results", () => {
    const collapsed = collect({ status: "collapsed", entryId: "collapsed" });
    const unchanged = collect({ status: "unchanged" });
    const malformed = { kind: "invalid", id: "a" } as unknown as ResolvePlan;

    commitData({
      commit: commit({ resolve: malformed }),
      push: collapsed.push,
      emitOp: collapsed.emitOp,
    });
    commitData({
      commit: commit({ resolve: malformed }),
      push: unchanged.push,
      emitOp: unchanged.emitOp,
    });

    expect(collapsed.emitted()).toEqual([]);
    expect(unchanged.emitted()).toEqual([]);
  });

  test("does not emit resolver ops for none or malformed plans", () => {
    const none = collect({ status: "pushed", entryId: "none" });
    const malformed = collect({ status: "pushed", entryId: "malformed" });

    commitData({
      commit: commit({ resolve: { kind: "none" } }),
      push: none.push,
      emitOp: none.emitOp,
    });
    commitData({
      commit: commit({
        resolve: { kind: "invalid", id: "a" } as unknown as ResolvePlan,
      }),
      push: malformed.push,
      emitOp: malformed.emitOp,
    });

    expect(none.emitted()).toEqual([]);
    expect(malformed.emitted()).toEqual([]);
  });
});
