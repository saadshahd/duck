import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { copy, paste } from "./clipboard.js";
import { type ComponentMap } from "./add.js";
import { findById, allIds } from "./helpers.js";

const config: ComponentMap = {
  Stack: { defaultProps: { items: [] } },
  Text: { defaultProps: { text: "default" } },
};

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

describe("copy", () => {
  it("returns a clone of the targeted subtree", () => {
    const data = sample();
    const result = copy(data, "s1");
    const cloned = result._unsafeUnwrap();
    expect(cloned.props.id).toBe("s1");
    expect(cloned).not.toBe(findById(data, "s1"));
    // mutating the clone doesn't affect the source
    (cloned.props.items as ComponentData[]).push(text("oops"));
    expect(
      (findById(data, "s1")!.props.items as ComponentData[]).map(
        (c) => c.props.id,
      ),
    ).toEqual(["t1", "t2"]);
  });

  it("element-not-found for unknown id", () => {
    const result = copy(sample(), "zzz");
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("element-not-found");
  });
});

describe("paste", () => {
  it("inserts a fresh subtree with regenerated ids", () => {
    const data = sample();
    const subtree = copy(data, "s1")._unsafeUnwrap();
    const { data: next } = paste(
      data,
      null,
      null,
      subtree,
      config,
    )._unsafeUnwrap();
    expect(next.content.length).toBe(2);
    const newRoot = next.content[1];
    // ids must not collide with originals
    expect(newRoot.props.id).not.toBe("s1");
    const newItems = newRoot.props.items as ComponentData[];
    const newItemIds = newItems.map((c) => c.props.id as string);
    expect(newItemIds).not.toContain("t1");
    expect(newItemIds).not.toContain("t2");
  });

  it("all ids are unique across the resulting data", () => {
    const data = sample();
    const subtree = copy(data, "s1")._unsafeUnwrap();
    const ids = allIds(
      paste(data, null, null, subtree, config)._unsafeUnwrap().data,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("regenerates ids on a deeply nested subtree", () => {
    const deep: Data = {
      root: { props: {} },
      content: [stack("a", [stack("b", [stack("c", [text("d")])])])],
    };
    const subtree = copy(deep, "a")._unsafeUnwrap();
    const ids = allIds(
      paste(deep, null, null, subtree, config)._unsafeUnwrap().data,
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(8);
  });

  it("does not mutate the original data", () => {
    const original = sample();
    const subtree = copy(original, "s1")._unsafeUnwrap();
    paste(original, null, null, subtree, config);
    expect(original.content.length).toBe(1);
  });

  it("pastes into a slot at a given index", () => {
    const data = sample();
    const subtree = copy(data, "t1")._unsafeUnwrap();
    const result = paste(data, "s1", "items", subtree, config, 1);
    const items = (
      findById(result._unsafeUnwrap().data, "s1")!.props
        .items as ComponentData[]
    ).map((c) => c.props.text);
    expect(items[0]).toBe("x");
    expect(items[1]).toBe("x"); // pasted clone with same text
    expect(items.length).toBe(3);
  });

  it("propagates parent-not-found from add", () => {
    const data = sample();
    const subtree = copy(data, "t1")._unsafeUnwrap();
    const result = paste(data, "missing", "items", subtree, config);
    expect(result._unsafeUnwrapErr().tag).toBe("parent-not-found");
  });
});
