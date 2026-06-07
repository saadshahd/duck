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

const make = (
  lastSelectedId: string | null,
  pointer = "selected",
  selectedSlot: { parentId: string; slotKey: string } | null = null,
) => {
  const { calls, send } = collect();
  const fn = createSelectParent({
    data: data(),
    lastSelectedId,
    pointer,
    selectedSlot,
    send,
  });
  return { calls, fn };
};

describe("createSelectParent", () => {
  test("returns undefined when lastSelectedId is null", () => {
    const { fn } = make(null);
    expect(fn).toBeUndefined();
  });

  test("returns a function when lastSelectedId is valid", () => {
    const { fn } = make("item");
    expect(typeof fn).toBe("function");
  });

  test("in selected: climbs node→node — sends SELECT for the parent node, never SELECT_SLOT", () => {
    const { calls, fn } = make("item");
    fn!();
    expect(calls).toEqual([{ type: "SELECT", elementId: "section" }]);
  });

  test("in selected: sends DESELECT for top-level child (no component parent)", () => {
    const { calls, fn } = make("section");
    fn!();
    expect(calls).toEqual([{ type: "DESELECT" }]);
  });

  test("in selected: sends DESELECT for orphan element", () => {
    const { calls, fn } = make("missing");
    fn!();
    expect(calls).toEqual([{ type: "DESELECT" }]);
  });

  test("in slot-selected: sends SELECT with the selectedSlot parentId (climbs to parent element)", () => {
    const { calls, fn } = make("item", "slot-selected", {
      parentId: "section",
      slotKey: "items",
    });
    fn!();
    expect(calls).toEqual([{ type: "SELECT", elementId: "section" }]);
  });

  test("in slot-selected without selectedSlot: falls back to DESELECT path", () => {
    const { calls, fn } = make("section", "slot-selected", null);
    fn!();
    expect(calls).toEqual([{ type: "DESELECT" }]);
  });
});
