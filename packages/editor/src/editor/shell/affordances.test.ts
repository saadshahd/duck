import { describe, test, expect } from "bun:test";
import {
  interactionState,
  affordancesFor,
  type InteractionState,
} from "./affordances.js";

const base = { hasSelection: true, hasSlot: false };

describe("interactionState", () => {
  test("drag carrying wins over any pointer", () => {
    expect(
      interactionState({ ...base, pointer: "selected", drag: "carrying" }),
    ).toBe("carrying");
    expect(
      interactionState({
        ...base,
        pointer: "slot-selected",
        hasSlot: true,
        drag: "carrying",
      }),
    ).toBe("carrying");
  });

  test("drag dragging wins over pointer selected", () => {
    expect(
      interactionState({ ...base, pointer: "selected", drag: "dragging" }),
    ).toBe("dragging");
  });

  test("drag dragging wins over pointer slot-selected", () => {
    expect(
      interactionState({
        ...base,
        pointer: "slot-selected",
        hasSlot: true,
        drag: "dragging",
      }),
    ).toBe("dragging");
  });

  test("slot-selected with a slot, drag idle", () => {
    expect(
      interactionState({
        pointer: "slot-selected",
        drag: "idle",
        hasSelection: false,
        hasSlot: true,
      }),
    ).toBe("slot-selected");
  });

  test("slot-selected without a slot → none", () => {
    expect(
      interactionState({
        pointer: "slot-selected",
        drag: "idle",
        hasSelection: false,
        hasSlot: false,
      }),
    ).toBe("none");
  });

  test("selected with a selection → resting-selected", () => {
    expect(
      interactionState({ ...base, pointer: "selected", drag: "idle" }),
    ).toBe("resting-selected");
  });

  test("editing and inserting (sibling, no slot) resolve to resting-selected", () => {
    expect(
      interactionState({ ...base, pointer: "editing", drag: "idle" }),
    ).toBe("resting-selected");
    expect(
      interactionState({ ...base, pointer: "inserting", drag: "idle" }),
    ).toBe("resting-selected");
  });

  test("inserting into a chosen slot keeps the slot-selected affordances (bands stay painted under the picker)", () => {
    expect(
      interactionState({
        pointer: "inserting",
        drag: "idle",
        hasSelection: false,
        hasSlot: true,
      }),
    ).toBe("slot-selected");
  });

  test("selected without a selection → none", () => {
    expect(
      interactionState({
        pointer: "selected",
        drag: "idle",
        hasSelection: false,
        hasSlot: false,
      }),
    ).toBe("none");
  });

  test("idle / hovering → none", () => {
    expect(interactionState({ ...base, pointer: "idle", drag: "idle" })).toBe(
      "none",
    );
    expect(
      interactionState({ ...base, pointer: "hovering", drag: "idle" }),
    ).toBe("none");
  });
});

describe("affordancesFor — sets are complete and non-overlapping", () => {
  test("selection identity and the slot stop never co-appear", () => {
    // Selection rings (element identity) and the slot stop (slot identity)
    // encode mutually exclusive "what is selected" data — no state may show
    // both at once.
    for (const state of [
      "resting-selected",
      "slot-selected",
      "dragging",
      "carrying",
      "none",
    ] as InteractionState[]) {
      const set = affordancesFor(state);
      expect(set.selectionRings && set.slotStop).toBe(false);
    }
  });

  test("the drop overlay never co-appears with resting selection affordances", () => {
    // While a drop overlay is painted (drag/carry), no resting-selection datum
    // is shown — the two never overlap within a state.
    for (const state of [
      "resting-selected",
      "slot-selected",
      "dragging",
      "carrying",
      "none",
    ] as InteractionState[]) {
      const set = affordancesFor(state);
      const restingAffordance =
        set.selectionRings || set.actionBar || set.boxModel || set.slotStop;
      expect(set.dropOverlay && restingAffordance).toBe(false);
    }
  });

  test("resting-selected owns identity, label, box-model, action bar", () => {
    expect(affordancesFor("resting-selected")).toEqual({
      selectionRings: true,
      labelCluster: true,
      boxModel: true,
      actionBar: true,
      slotStop: false,
      slotInsert: false,
      dropOverlay: false,
      liftPulse: false,
      cycleChip: false,
    });
  });

  test("slot-selected owns the slot stop and slot insert; node label cluster yields", () => {
    // R12: the slot-stop label is the sole namer of the selected slot. The node
    // label cluster (element type + slot address) yields entirely so the slot
    // name is never double-painted.
    expect(affordancesFor("slot-selected")).toEqual({
      selectionRings: false,
      labelCluster: false,
      boxModel: false,
      actionBar: false,
      slotStop: true,
      slotInsert: true,
      dropOverlay: false,
      liftPulse: false,
      cycleChip: false,
    });
  });

  test("dragging owns the drop overlay and cycle chip", () => {
    expect(affordancesFor("dragging")).toEqual({
      selectionRings: false,
      labelCluster: false,
      boxModel: false,
      actionBar: false,
      slotStop: false,
      slotInsert: false,
      dropOverlay: true,
      liftPulse: false,
      cycleChip: true,
    });
  });

  test("carrying owns the drop overlay, lift pulse, and cycle chip", () => {
    expect(affordancesFor("carrying")).toEqual({
      selectionRings: false,
      labelCluster: false,
      boxModel: false,
      actionBar: false,
      slotStop: false,
      slotInsert: false,
      dropOverlay: true,
      liftPulse: true,
      cycleChip: true,
    });
  });

  test("none owns nothing", () => {
    expect(
      Object.values(affordancesFor("none")).every((v) => v === false),
    ).toBe(true);
  });
});
