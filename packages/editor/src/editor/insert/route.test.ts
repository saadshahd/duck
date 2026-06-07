import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { routeInsert } from "./route.js";

const text = (id: string): ComponentData => ({
  type: "Text",
  props: { id, text: "Hello" },
});

const card = (
  id: string,
  slots: Record<string, ComponentData[]>,
): ComponentData => ({
  type: "Card",
  props: { id, ...slots },
});

const data = (): Data => ({
  root: { props: {} },
  content: [
    card("multi", {
      header: [text("h")],
      body: [text("b")],
      footer: [],
    }),
    text("plain"),
  ],
});

const singleSlotData = (): Data => ({
  root: { props: {} },
  content: [card("solo", { body: [text("only")] })],
});

describe("routeInsert", () => {
  test("no selection → root append", () => {
    expect(routeInsert(data(), null)).toEqual({ kind: "root" });
  });

  test("missing element → root append", () => {
    expect(routeInsert(data(), "ghost")).toEqual({ kind: "root" });
  });

  test("multi-slot node → slot-choice carrying every slot key in declaration order", () => {
    expect(routeInsert(data(), "multi")).toEqual({
      kind: "slot-choice",
      parentId: "multi",
      slotKeys: ["header", "body", "footer"],
    });
  });

  test("single-slot node → slot-choice with one slot key (named, no real choice)", () => {
    expect(routeInsert(singleSlotData(), "solo")).toEqual({
      kind: "slot-choice",
      parentId: "solo",
      slotKeys: ["body"],
    });
  });

  test("leaf node with a slot parent → sibling insert after it", () => {
    expect(routeInsert(data(), "h")).toEqual({
      kind: "sibling",
      target: { parentId: "multi", slotKey: "header", index: 1 },
    });
  });

  test("top-level leaf → sibling insert at root after it", () => {
    expect(routeInsert(data(), "plain")).toEqual({
      kind: "sibling",
      target: { parentId: null, slotKey: null, index: 2 },
    });
  });
});
