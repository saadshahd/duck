import { describe, it, expect } from "bun:test";
import type { ComponentData } from "@puckeditor/core";
import { slotKeysOf, slotPathsOf } from "./slot-keys-of.js";

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

describe("slotPathsOf", () => {
  it("emits single-segment paths for top-level slots", () => {
    const c = make("Layout", "l1", {
      header: [make("Heading", "h1")],
      body: [make("Text", "t1")],
      gap: 4,
    });
    expect(slotPathsOf(c)).toEqual([["header"], ["body"]]);
  });

  it("skips primitive arrays (tags)", () => {
    const c = make("Tag", "t1", { tags: ["a", "b"], counts: [1, 2] });
    expect(slotPathsOf(c)).toEqual([]);
  });

  it("recurses arrays of plain objects but emits nothing when no slot is found", () => {
    const c = make("Features", "f1", {
      features: [{ title: "one" }, { title: "two" }],
    });
    expect(slotPathsOf(c)).toEqual([]);
  });

  it("emits a per-index path for a slot nested in an array item", () => {
    const c = make("Sections", "s1", {
      items: [
        { heading: "a", content: [make("Text", "a-text")] },
        { heading: "b", content: [] },
      ],
    });
    expect(slotPathsOf(c)).toEqual([
      ["items", 0, "content"],
      ["items", 1, "content"],
    ]);
  });

  it("emits a path for a slot nested in an object field", () => {
    const c = make("Panel", "p1", {
      config: { body: [make("Text", "t1")] },
    });
    expect(slotPathsOf(c)).toEqual([["config", "body"]]);
  });
});
