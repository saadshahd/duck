import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { openInsertEvent } from "./use-insert.js";

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
    card("multi", { header: [text("h")], body: [text("b")], footer: [] }),
    card("solo", { body: [text("only")] }),
    text("plain"),
  ],
});

describe("openInsertEvent", () => {
  test("slot-selected: opens the picker for the ALREADY-chosen slot — OPEN_INSERT, never SELECT_SLOT", () => {
    // A slot is already chosen (machine context holds selectedSlot). openInsert
    // must NOT re-route — re-sending SELECT_SLOT(first slot) would silently reset
    // the user's slot choice. It opens the picker for the current slot.
    expect(
      openInsertEvent({
        data: data(),
        lastSelectedId: "multi",
        pointer: "slot-selected",
      }),
    ).toEqual({ type: "OPEN_INSERT" });
  });

  test("selected multi-slot node: routes to the slot-choice step (SELECT_SLOT first slot)", () => {
    expect(
      openInsertEvent({
        data: data(),
        lastSelectedId: "multi",
        pointer: "selected",
      }),
    ).toEqual({ type: "SELECT_SLOT", parentId: "multi", slotKey: "header" });
  });

  test("selected single-slot node: one action straight to the picker (OPEN_INSERT_SLOT)", () => {
    expect(
      openInsertEvent({
        data: data(),
        lastSelectedId: "solo",
        pointer: "selected",
      }),
    ).toEqual({ type: "OPEN_INSERT_SLOT", parentId: "solo", slotKey: "body" });
  });

  test("selected leaf: opens the direct sibling picker (OPEN_INSERT)", () => {
    expect(
      openInsertEvent({
        data: data(),
        lastSelectedId: "plain",
        pointer: "selected",
      }),
    ).toEqual({ type: "OPEN_INSERT" });
  });

  test("no selection: opens the direct (root) picker (OPEN_INSERT)", () => {
    expect(
      openInsertEvent({
        data: data(),
        lastSelectedId: null,
        pointer: "selected",
      }),
    ).toEqual({ type: "OPEN_INSERT" });
  });
});
