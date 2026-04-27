import { describe, it, expect } from "bun:test";
import type { ComponentData } from "@puckeditor/core";
import { slotKeysOf } from "./slot-keys-of.js";

const make = (
  type: string,
  id: string,
  extra: Record<string, unknown> = {},
): ComponentData =>
  ({ type, props: { id, ...extra } }) as unknown as ComponentData;

describe("slotKeysOf", () => {
  it("returns empty for component with only scalar props", () => {
    const c = make("Heading", "h1", { text: "hello", level: 2 });
    expect(slotKeysOf(c)).toEqual([]);
  });

  it("identifies a slot from a populated array of components", () => {
    const c = make("Card", "c1", {
      title: "x",
      items: [make("Text", "t1")],
    });
    expect(slotKeysOf(c)).toEqual(["items"]);
  });

  it("identifies multiple slots", () => {
    const c = make("Layout", "l1", {
      header: [make("Heading", "h1")],
      body: [make("Text", "t1"), make("Text", "t2")],
      gap: 4,
    });
    expect(slotKeysOf(c)).toEqual(["header", "body"]);
  });

  it("treats empty arrays as slots (vacuously)", () => {
    const c = make("Card", "c1", { items: [], tags: ["a", "b"] });
    expect(slotKeysOf(c)).toEqual(["items"]);
  });

  it("rejects arrays of strings or numbers", () => {
    const c = make("Tag", "t1", { values: ["a", "b"], counts: [1, 2] });
    expect(slotKeysOf(c)).toEqual([]);
  });

  it("rejects arrays of objects missing props.id", () => {
    const c = make("Misc", "m1", {
      stuff: [{ type: "X", props: {} }],
    });
    expect(slotKeysOf(c)).toEqual([]);
  });
});
