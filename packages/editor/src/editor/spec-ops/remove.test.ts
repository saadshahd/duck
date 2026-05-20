import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { expectErr, expectOk } from "../testing/result.js";
import { remove, removeMany } from "./remove.js";
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
      findById(expectOk(result), "s1")!.props.items as ComponentData[]
    ).map((c) => c.props.id);
    expect(items).toEqual(["t1", "t3"]);
  });

  it("removes a top-level entry", () => {
    const result = remove(sample(), "s2");
    expect(expectOk(result).content.map((c) => c.props.id)).toEqual(["s1"]);
  });

  it("removes a subtree (parent + descendants gone)", () => {
    const result = remove(sample(), "s1");
    const next = expectOk(result);
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
    expect(expectOk(result)).not.toBe(original);
  });

  it("element-not-found for missing id", () => {
    const result = remove(sample(), "zzz");
    expect(expectErr(result).tag).toBe("element-not-found");
  });
});

describe("removeMany", () => {
  it("removes ids in order", () => {
    const result = removeMany(sample(), ["t1", "t3"]);
    const items = (
      findById(expectOk(result), "s1")!.props.items as ComponentData[]
    ).map((c) => c.props.id);

    expect(items).toEqual(["t2"]);
  });

  it("stops at the first missing id", () => {
    const result = removeMany(sample(), ["t1", "zzz", "t2"]);

    expect(expectErr(result)).toEqual({
      tag: "element-not-found",
      id: "zzz",
    });
  });
});
