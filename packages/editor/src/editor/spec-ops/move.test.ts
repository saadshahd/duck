import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { move } from "./move.js";
import { findById } from "./helpers.js";

const text = (id: string): ComponentData => ({
  type: "Text",
  props: { id, text: id },
});

const stack = (id: string, items: ComponentData[]): ComponentData => ({
  type: "Stack",
  props: { id, items },
});

const twoStacks = (): Data => ({
  root: { props: {} },
  content: [
    stack("left", [text("a"), text("b")]),
    stack("right", [text("c"), text("d")]),
  ],
});

const nested = (): Data => ({
  root: { props: {} },
  content: [stack("outer", [stack("inner", [text("leaf")])])],
});

const flat = (): Data => ({
  root: { props: {} },
  content: [text("a"), text("b"), text("c")],
});

const itemsOf = (data: Data, id: string): string[] =>
  (findById(data, id)!.props.items as ComponentData[]).map(
    (c) => c.props.id as string,
  );

describe("move — between slots", () => {
  it("moves from one slot to another", () => {
    const result = move(twoStacks(), "a", "right", "items", 0);
    const next = result._unsafeUnwrap();
    expect(itemsOf(next, "left")).toEqual(["b"]);
    expect(itemsOf(next, "right")).toEqual(["a", "c", "d"]);
  });

  it("moves to end of target slot", () => {
    const result = move(twoStacks(), "a", "right", "items", 2);
    const next = result._unsafeUnwrap();
    expect(itemsOf(next, "right")).toEqual(["c", "d", "a"]);
  });

  it("moves between top-level and a slot", () => {
    const result = move(flat(), "b", null, null, 2);
    const next = result._unsafeUnwrap();
    expect(next.content.map((c) => c.props.id)).toEqual(["a", "c", "b"]);
  });

  it("moves from top-level into a slot", () => {
    const data: Data = {
      root: { props: {} },
      content: [text("solo"), stack("box", [])],
    };
    const result = move(data, "solo", "box", "items", 0);
    const next = result._unsafeUnwrap();
    expect(next.content.map((c) => c.props.id)).toEqual(["box"]);
    expect(itemsOf(next, "box")).toEqual(["solo"]);
  });
});

describe("move — within slot", () => {
  it("reorders within the same slot", () => {
    const result = move(twoStacks(), "a", "left", "items", 1);
    expect(itemsOf(result._unsafeUnwrap(), "left")).toEqual(["b", "a"]);
  });

  it("reorders top-level entries", () => {
    const result = move(flat(), "a", null, null, 2);
    const next = result._unsafeUnwrap();
    expect(next.content.map((c) => c.props.id)).toEqual(["b", "c", "a"]);
  });

  it("returns same Data reference when toIndex equals current index", () => {
    const original = twoStacks();
    const result = move(original, "a", "left", "items", 0);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(original);
  });

  it("returns same reference for top-level no-op", () => {
    const original = flat();
    const result = move(original, "b", null, null, 1);
    expect(result._unsafeUnwrap()).toBe(original);
  });
});

describe("move — errors", () => {
  it("element-not-found", () => {
    const result = move(twoStacks(), "zzz", "right", "items", 0);
    expect(result._unsafeUnwrapErr().tag).toBe("element-not-found");
  });

  it("parent-not-found", () => {
    const result = move(twoStacks(), "a", "missing", "items", 0);
    expect(result._unsafeUnwrapErr().tag).toBe("parent-not-found");
  });

  it("slot-not-defined when slot key is not an array on parent", () => {
    const result = move(twoStacks(), "a", "b", "items", 0);
    expect(result._unsafeUnwrapErr().tag).toBe("slot-not-defined");
  });

  it("index-out-of-bounds for negative target", () => {
    const result = move(twoStacks(), "a", "right", "items", -1);
    expect(result._unsafeUnwrapErr().tag).toBe("index-out-of-bounds");
  });

  it("index-out-of-bounds for too-large target", () => {
    const result = move(twoStacks(), "a", "right", "items", 99);
    expect(result._unsafeUnwrapErr().tag).toBe("index-out-of-bounds");
  });

  it("circular-move: drop into self", () => {
    const result = move(nested(), "outer", "outer", "items", 0);
    expect(result._unsafeUnwrapErr().tag).toBe("circular-move");
  });

  it("circular-move: drop into descendant", () => {
    const result = move(nested(), "outer", "inner", "items", 0);
    expect(result._unsafeUnwrapErr().tag).toBe("circular-move");
  });

  it("circular-move: drop into deeper descendant", () => {
    const data: Data = {
      root: { props: {} },
      content: [stack("a", [stack("b", [stack("c", [])])])],
    };
    const result = move(data, "a", "c", "items", 0);
    expect(result._unsafeUnwrapErr().tag).toBe("circular-move");
  });
});

describe("move — immutability", () => {
  it("does not mutate the original on success", () => {
    const original = twoStacks();
    const snapshot = JSON.stringify(original);
    move(original, "a", "right", "items", 0);
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it("returns a new Data reference for actual moves", () => {
    const original = twoStacks();
    const result = move(original, "a", "right", "items", 0);
    expect(result._unsafeUnwrap()).not.toBe(original);
  });
});
