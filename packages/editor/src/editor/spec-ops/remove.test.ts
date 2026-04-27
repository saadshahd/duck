import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { remove } from "./remove.js";
import { findById } from "./helpers.js";

const text = (id: string): ComponentData => ({
  type: "Text",
  props: { id, text: id },
});

const stack = (id: string, items: ComponentData[]): ComponentData => ({
  type: "Stack",
  props: { id, items },
});

const sample = (): Data => ({
  root: { props: {} },
  content: [stack("s1", [text("t1"), text("t2"), text("t3")]), stack("s2", [])],
});

describe("remove", () => {
  it("removes a leaf inside a slot", () => {
    const result = remove(sample(), "t2");
    const items = (
      findById(result._unsafeUnwrap(), "s1")!.props.items as ComponentData[]
    ).map((c) => c.props.id);
    expect(items).toEqual(["t1", "t3"]);
  });

  it("removes a top-level entry", () => {
    const result = remove(sample(), "s2");
    expect(result._unsafeUnwrap().content.map((c) => c.props.id)).toEqual([
      "s1",
    ]);
  });

  it("removes a subtree (parent + descendants gone)", () => {
    const result = remove(sample(), "s1");
    const next = result._unsafeUnwrap();
    expect(next.content.map((c) => c.props.id)).toEqual(["s2"]);
    expect(findById(next, "t1")).toBeNull();
    expect(findById(next, "t2")).toBeNull();
    expect(findById(next, "t3")).toBeNull();
  });

  it("does not mutate the original", () => {
    const original = sample();
    remove(original, "t1");
    const items = findById(original, "s1")!.props.items as ComponentData[];
    expect(items.map((c) => c.props.id)).toEqual(["t1", "t2", "t3"]);
  });

  it("returns new Data reference", () => {
    const original = sample();
    const result = remove(original, "t1");
    expect(result._unsafeUnwrap()).not.toBe(original);
  });

  it("element-not-found for missing id", () => {
    const result = remove(sample(), "zzz");
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("element-not-found");
  });
});
