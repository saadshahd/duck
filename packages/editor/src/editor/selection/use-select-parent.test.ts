import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { createSelectParent } from "./use-select-parent.js";

const text = (id: string): ComponentData => ({
  type: "Text",
  props: { id, text: "Hello" },
});

const box = (id: string, items: ComponentData[]): ComponentData => ({
  type: "Box",
  props: { id, items },
});

const data = (): Data => ({
  root: { props: {} },
  content: [box("section", [text("item")])],
});

const collect = () => {
  const calls: unknown[] = [];
  const send = (e: unknown) => calls.push(e);
  return { calls, send };
};

describe("createSelectParent", () => {
  test("returns undefined when lastSelectedId is null", () => {
    const { send } = collect();
    expect(createSelectParent(data(), null, send)).toBeUndefined();
  });

  test("returns a function when lastSelectedId is valid", () => {
    const { send } = collect();
    expect(typeof createSelectParent(data(), "item", send)).toBe("function");
  });

  test("sends SELECT with parent id", () => {
    const { calls, send } = collect();
    createSelectParent(data(), "item", send)!();
    expect(calls).toEqual([{ type: "SELECT", elementId: "section" }]);
  });

  test("sends DESELECT for top-level child (no component parent)", () => {
    const { calls, send } = collect();
    createSelectParent(data(), "section", send)!();
    expect(calls).toEqual([{ type: "DESELECT" }]);
  });

  test("sends DESELECT for orphan element", () => {
    const { calls, send } = collect();
    createSelectParent(data(), "missing", send)!();
    expect(calls).toEqual([{ type: "DESELECT" }]);
  });
});
