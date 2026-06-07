import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { NO_TARGET_LABEL, type DropTarget } from "../layout/index.js";
import {
  announcerMessage,
  assertiveCarryMessage,
} from "./announcer-message.js";

// --- Factories ---

const leaf = (id: string, type = "Text"): ComponentData => ({
  type,
  props: { id },
});

const card = (
  id: string,
  slots: Record<string, ComponentData[]>,
): ComponentData => ({
  type: "Card",
  props: { id, ...slots },
});

const data = (content: ComponentData[]): Data => ({
  root: { props: {} },
  content,
});

const containerTarget = (
  elementId: string,
  slotKey: string,
  index: number,
): DropTarget => ({
  kind: "container",
  elementId,
  slotKey,
  index,
  tiling: { kind: "discrete", slots: [{ slotKey }] },
  activeLabel: slotKey,
});

const flashPoint = { x: 10, y: 20 };

const baseArgs = {
  data: data([]),
  drag: "idle",
  pointer: "selected",
  dropTarget: null,
  carryTarget: null,
  cycleStatus: null,
  carryCycleStatus: null,
  slotAddress: undefined,
  noTargetFlash: null,
};

// --- announcerMessage (polite) ---

describe("announcerMessage", () => {
  test("dragging with dropTarget, no cycleStatus → bare label", () => {
    const d = data([card("card", { header: [leaf("h")] })]);
    expect(
      announcerMessage({
        ...baseArgs,
        data: d,
        drag: "dragging",
        dropTarget: containerTarget("card", "header", 1),
      }),
    ).toBe("Card › header");
  });

  test("dragging with dropTarget and cycleStatus → cycle-prefixed label", () => {
    const d = data([card("card", { header: [leaf("h")] })]);
    expect(
      announcerMessage({
        ...baseArgs,
        data: d,
        drag: "dragging",
        dropTarget: containerTarget("card", "header", 1),
        cycleStatus: { phase: "stepping", step: 2, total: 3 },
      }),
    ).toBe("Destination 2 of 3: Card › header");
  });

  test("dragging at entry (cycle not stepping) → bare label, no N-of-M prefix", () => {
    const d = data([card("card", { header: [leaf("h")] })]);
    expect(
      announcerMessage({
        ...baseArgs,
        data: d,
        drag: "dragging",
        dropTarget: containerTarget("card", "header", 1),
        cycleStatus: { phase: "entry", modality: "drag" },
      }),
    ).toBe("Card › header");
  });

  test("carrying with carryTarget → carry destination label", () => {
    const d = data([card("card", { body: [leaf("b")] })]);
    expect(
      announcerMessage({
        ...baseArgs,
        data: d,
        drag: "carrying",
        carryTarget: containerTarget("card", "body", 1),
      }),
    ).toBe("Card › body");
  });

  test("carrying with noTargetFlash → polite no-target echo (over carry status)", () => {
    const d = data([card("card", { body: [leaf("b")] })]);
    expect(
      announcerMessage({
        ...baseArgs,
        data: d,
        drag: "carrying",
        carryTarget: containerTarget("card", "body", 1),
        noTargetFlash: flashPoint,
      }),
    ).toBe(NO_TARGET_LABEL);
  });

  test("slot-selected with slotAddress → slot selected message", () => {
    expect(
      announcerMessage({
        ...baseArgs,
        pointer: "slot-selected",
        slotAddress: "Card › body",
      }),
    ).toBe("Slot Card › body selected");
  });

  test("idle with nothing announceable → empty string", () => {
    expect(announcerMessage(baseArgs)).toBe("");
  });

  test("noTargetFlash outside carry is ignored → empty string", () => {
    expect(
      announcerMessage({
        ...baseArgs,
        drag: "idle",
        noTargetFlash: flashPoint,
      }),
    ).toBe("");
  });

  test("carrying with carryTarget and carryCycleStatus → cycle-prefixed label", () => {
    const d = data([card("card", { body: [leaf("b")] })]);
    expect(
      announcerMessage({
        ...baseArgs,
        data: d,
        drag: "carrying",
        carryTarget: containerTarget("card", "body", 1),
        carryCycleStatus: { phase: "stepping", step: 1, total: 3 },
      }),
    ).toBe("Destination 1 of 3: Card › body");
  });

  test("carrying at entry (cycle not stepping) → bare label, no N-of-M prefix", () => {
    const d = data([card("card", { body: [leaf("b")] })]);
    expect(
      announcerMessage({
        ...baseArgs,
        data: d,
        drag: "carrying",
        carryTarget: containerTarget("card", "body", 1),
        carryCycleStatus: { phase: "entry", modality: "carry" },
      }),
    ).toBe("Card › body");
  });

  test("carrying with carryTarget, no carryCycleStatus → bare label (cycle not active)", () => {
    const d = data([card("card", { body: [leaf("b")] })]);
    expect(
      announcerMessage({
        ...baseArgs,
        data: d,
        drag: "carrying",
        carryTarget: containerTarget("card", "body", 1),
        carryCycleStatus: null,
      }),
    ).toBe("Card › body");
  });
});

// --- assertiveCarryMessage (assertive) ---

describe("assertiveCarryMessage", () => {
  test("not carrying → empty string", () => {
    expect(
      assertiveCarryMessage({
        data: data([leaf("a")]),
        drag: "idle",
        dragSourceId: "a",
      }),
    ).toBe("");
  });

  test("carrying without a source → empty string", () => {
    expect(
      assertiveCarryMessage({
        data: data([leaf("a")]),
        drag: "carrying",
        dragSourceId: null,
      }),
    ).toBe("");
  });

  test("carrying with a source → mode-entry message naming the source type and cycling mechanism", () => {
    expect(
      assertiveCarryMessage({
        data: data([leaf("a", "Heading")]),
        drag: "carrying",
        dragSourceId: "a",
      }),
    ).toBe(
      "Moving Heading. Tab or Shift+Tab to cycle destinations. Click or press Enter to drop, Esc to cancel.",
    );
  });

  test("carrying with a source missing from data → falls back to 'element'", () => {
    expect(
      assertiveCarryMessage({
        data: data([leaf("a")]),
        drag: "carrying",
        dragSourceId: "missing",
      }),
    ).toBe(
      "Moving element. Tab or Shift+Tab to cycle destinations. Click or press Enter to drop, Esc to cancel.",
    );
  });
});
