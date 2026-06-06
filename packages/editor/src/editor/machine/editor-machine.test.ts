import { describe, it, expect } from "bun:test";
import { createActor } from "xstate";
import { createTestModel } from "xstate/graph";
import {
  editorMachine,
  type EditorContext,
  type EditorEvent,
} from "./editor-machine.js";

// --- State verification: behavioral contracts per state ---

type Verify = (ctx: EditorContext) => void;

const stateVerifiers: Record<string, Verify> = {
  "pointer.idle": (ctx) => {
    expect(ctx.selectedIds.size).toBe(0);
    expect(ctx.selectedSlot).toBeNull();
  },
  "pointer.hovering": (ctx) => {
    expect(ctx.hoveredId).not.toBeNull();
  },
  "pointer.selected": (ctx) => {
    expect(ctx.selectedIds.size).toBeGreaterThan(0);
    expect(ctx.editing).toBeNull();
    expect(ctx.selectedSlot).toBeNull();
  },
  "pointer.slot-selected": (ctx) => {
    expect(ctx.selectedIds.size).toBe(0);
    expect(ctx.selectedSlot).not.toBeNull();
  },
  "pointer.dragging": (ctx) => {
    expect(ctx.dragSourceId).not.toBeNull();
    expect(ctx.selectedSlot).toBeNull();
  },
  "pointer.editing": (ctx) => {
    expect(ctx.editing).not.toBeNull();
    expect(ctx.selectedIds.size).toBeGreaterThan(0);
  },
  "drag.idle": (ctx) => {
    expect(ctx.dragSourceId).toBeNull();
  },
  "drag.dragging": (ctx) => {
    expect(ctx.dragSourceId).not.toBeNull();
  },
  "drag.carrying": (ctx) => {
    expect(ctx.dragSourceId).not.toBeNull();
  },
};

// --- Event samples (one per event type, flat array for model traversal) ---

const sampleEvents = [
  { type: "HOVER" as const, elementId: "el-1" },
  { type: "UNHOVER" as const },
  { type: "SELECT" as const, elementId: "el-1" },
  { type: "TOGGLE_SELECT" as const, elementId: "el-2" },
  { type: "DESELECT" as const },
  { type: "SELECT_SLOT" as const, parentId: "card", slotKey: "body" },
  { type: "OPEN_POPOVER" as const },
  {
    type: "START_INLINE_EDIT" as const,
    elementId: "el-1",
    propKey: "text",
    original: "Hello",
    trigger: "select" as const,
  },
  { type: "COMMIT_EDIT" as const, newValue: "World" },
  { type: "CANCEL_EDIT" as const },
  { type: "DRAG_START" as const, sourceId: "el-1" },
  {
    type: "DROP" as const,
    sourceParentId: "page",
    targetParentId: "page",
    fromIndex: 0,
    toIndex: 1,
  },
  { type: "DRAG_CANCEL" as const },
  { type: "CARRY_START" as const, sourceId: "el-1" },
  { type: "CARRY_COMMIT" as const },
  { type: "CARRY_CANCEL" as const },
  { type: "ESCAPE" as const },
];

// --- Model-based testing: auto-generated path coverage ---

const model = createTestModel(editorMachine);

const paths = model.getShortestPaths({ events: sampleEvents });

const stateHandlers = Object.fromEntries(
  Object.entries(stateVerifiers).map(([key, verify]) => [
    key,
    (snapshot: { context: EditorContext }) => verify(snapshot.context),
  ]),
);

const eventTypes = [...new Set(sampleEvents.map((e) => e.type))];
const noopEvents = Object.fromEntries(eventTypes.map((e) => [e, () => {}]));

describe("editor machine (model-based)", () => {
  for (const path of paths) {
    it(path.description, async () => {
      await path.test({
        states: stateHandlers,
        events: noopEvents,
      });
    });
  }
});

// --- Helper ---

const walk = (...events: EditorEvent[]) => {
  const actor = createActor(editorMachine);
  actor.start();
  for (const e of events) actor.send(e);
  return actor.getSnapshot();
};

type MachineValue = { pointer: string; drag: string };

// --- Cross-region exclusivity ---

describe("exclusivity guards", () => {
  it("drag blocked while editing", () => {
    const s = walk(
      { type: "HOVER", elementId: "x" },
      { type: "SELECT", elementId: "x" },
      { type: "OPEN_POPOVER" },
      { type: "DRAG_START", sourceId: "x" },
    );
    expect((s.value as MachineValue).drag).toBe("idle");
  });

  it("popover blocked while dragging", () => {
    const s = walk(
      { type: "HOVER", elementId: "x" },
      { type: "SELECT", elementId: "x" },
      { type: "DRAG_START", sourceId: "x" },
      { type: "OPEN_POPOVER" },
    );
    expect((s.value as MachineValue).pointer).toBe("dragging");
    expect(s.context.editing).toBeNull();
  });

  it("inline edit blocked while dragging", () => {
    const s = walk(
      { type: "HOVER", elementId: "x" },
      { type: "SELECT", elementId: "x" },
      { type: "DRAG_START", sourceId: "x" },
      {
        type: "START_INLINE_EDIT",
        elementId: "x",
        propKey: "text",
        original: "Hi",
        trigger: "select" as const,
      },
    );
    expect((s.value as MachineValue).pointer).toBe("dragging");
    expect(s.context.editing).toBeNull();
  });
});

// --- Inline edit trigger variants ---

describe("inline edit trigger", () => {
  it("select trigger stores propKey and original", () => {
    const s = walk(
      { type: "SELECT", elementId: "x" },
      {
        type: "START_INLINE_EDIT",
        elementId: "x",
        propKey: "text",
        original: "Hi",
        trigger: "select" as const,
      },
    );
    expect(s.context.editing).toEqual({
      elementId: "x",
      mode: "inline",
      propKey: "text",
      original: "Hi",
      trigger: "select",
    });
  });

  it("replace trigger stores char", () => {
    const s = walk(
      { type: "SELECT", elementId: "x" },
      {
        type: "START_INLINE_EDIT",
        elementId: "x",
        propKey: "text",
        original: "Hi",
        trigger: "replace" as const,
        char: "H",
      },
    );
    expect(s.context.editing).toEqual({
      elementId: "x",
      mode: "inline",
      propKey: "text",
      original: "Hi",
      trigger: "replace",
      char: "H",
    });
  });
});

// --- Reconciliation in editing state ---

describe("editing state reconciliation", () => {
  it("DESELECT while editing transitions to idle and clears editing", () => {
    const s = walk(
      { type: "SELECT", elementId: "x" },
      { type: "OPEN_POPOVER" },
      { type: "DESELECT" },
    );
    expect((s.value as MachineValue).pointer).toBe("idle");
    expect(s.context.selectedIds.size).toBe(0);
    expect(s.context.editing).toBeNull();
  });

  it("REPLACE_SELECT while editing transitions to selected with new IDs", () => {
    const s = walk(
      { type: "SELECT", elementId: "x" },
      { type: "OPEN_POPOVER" },
      { type: "REPLACE_SELECT", elementIds: ["y"] },
    );
    expect((s.value as MachineValue).pointer).toBe("selected");
    expect(s.context.selectedIds).toEqual(new Set(["y"]));
    expect(s.context.editing).toBeNull();
  });

  it("REPLACE_SELECT with empty list while editing transitions to idle", () => {
    const s = walk(
      { type: "SELECT", elementId: "x" },
      { type: "OPEN_POPOVER" },
      { type: "REPLACE_SELECT", elementIds: [] },
    );
    expect((s.value as MachineValue).pointer).toBe("idle");
    expect(s.context.selectedIds.size).toBe(0);
    expect(s.context.editing).toBeNull();
  });
});

// --- ESCAPE behavior ---

describe("ESCAPE behavior", () => {
  it("pointer selected → ESCAPE deselects", () => {
    const s = walk({ type: "SELECT", elementId: "x" }, { type: "ESCAPE" });
    expect((s.value as MachineValue).pointer).toBe("idle");
    expect(s.context.selectedIds.size).toBe(0);
    expect(s.context.lastSelectedId).toBeNull();
  });

  it("pointer editing → ESCAPE cancels edit", () => {
    const s = walk(
      { type: "SELECT", elementId: "x" },
      { type: "OPEN_POPOVER" },
      { type: "ESCAPE" },
    );
    expect((s.value as MachineValue).pointer).toBe("selected");
    expect(s.context.editing).toBeNull();
  });
});

// --- Multi-select ---

describe("multi-select", () => {
  it("SELECT sets single element", () => {
    const s = walk({ type: "SELECT", elementId: "a" });
    expect(s.context.selectedIds).toEqual(new Set(["a"]));
    expect(s.context.lastSelectedId).toBe("a");
  });

  it("SELECT replaces previous selection", () => {
    const s = walk(
      { type: "SELECT", elementId: "a" },
      { type: "SELECT", elementId: "b" },
    );
    expect(s.context.selectedIds).toEqual(new Set(["b"]));
    expect(s.context.lastSelectedId).toBe("b");
  });

  it("TOGGLE_SELECT from idle transitions to selected", () => {
    const s = walk({ type: "TOGGLE_SELECT", elementId: "a" });
    expect((s.value as MachineValue).pointer).toBe("selected");
    expect(s.context.selectedIds).toEqual(new Set(["a"]));
    expect(s.context.lastSelectedId).toBe("a");
  });

  it("TOGGLE_SELECT adds to set", () => {
    const s = walk(
      { type: "SELECT", elementId: "a" },
      { type: "TOGGLE_SELECT", elementId: "b" },
    );
    expect(s.context.selectedIds).toEqual(new Set(["a", "b"]));
    expect(s.context.lastSelectedId).toBe("b");
  });

  it("TOGGLE_SELECT removes existing element", () => {
    const s = walk(
      { type: "SELECT", elementId: "a" },
      { type: "TOGGLE_SELECT", elementId: "b" },
      { type: "TOGGLE_SELECT", elementId: "a" },
    );
    expect(s.context.selectedIds).toEqual(new Set(["b"]));
    expect(s.context.lastSelectedId).toBe("b");
  });

  it("TOGGLE_SELECT last element transitions to idle", () => {
    const s = walk(
      { type: "SELECT", elementId: "a" },
      { type: "TOGGLE_SELECT", elementId: "a" },
    );
    expect((s.value as MachineValue).pointer).toBe("idle");
    expect(s.context.selectedIds.size).toBe(0);
    expect(s.context.lastSelectedId).toBeNull();
  });

  it("DESELECT clears multi-selection", () => {
    const s = walk(
      { type: "SELECT", elementId: "a" },
      { type: "TOGGLE_SELECT", elementId: "b" },
      { type: "DESELECT" },
    );
    expect(s.context.selectedIds.size).toBe(0);
    expect(s.context.lastSelectedId).toBeNull();
  });

  it("OPEN_POPOVER collapses multi to singleton", () => {
    const s = walk(
      { type: "SELECT", elementId: "a" },
      { type: "TOGGLE_SELECT", elementId: "b" },
      { type: "OPEN_POPOVER" },
    );
    expect(s.context.selectedIds).toEqual(new Set(["b"]));
    expect(s.context.editing).toEqual({
      elementId: "b",
      mode: "popover",
    });
  });
});

// --- Carry: exhaustive drag-region state × event matrix ---

const dragOf = (s: { value: unknown }) => (s.value as MachineValue).drag;

const carryStart = { type: "CARRY_START" as const, sourceId: "el-1" };
const dragStart = { type: "DRAG_START" as const, sourceId: "el-1" };

describe("carry: from drag.idle", () => {
  it("CARRY_START → carrying, assigns dragSourceId", () => {
    const s = walk({ type: "SELECT", elementId: "el-1" }, carryStart);
    expect(dragOf(s)).toBe("carrying");
    expect(s.context.dragSourceId).toBe("el-1");
  });

  it("CARRY_START blocked while editing (notEditing guard)", () => {
    const s = walk(
      { type: "SELECT", elementId: "el-1" },
      { type: "OPEN_POPOVER" },
      carryStart,
    );
    expect(dragOf(s)).toBe("idle");
    expect(s.context.dragSourceId).toBeNull();
  });

  it("CARRY_COMMIT ignored (no transition)", () => {
    const s = walk({ type: "CARRY_COMMIT" });
    expect(dragOf(s)).toBe("idle");
    expect(s.context.dragSourceId).toBeNull();
  });

  it("CARRY_CANCEL ignored (no transition)", () => {
    const s = walk({ type: "CARRY_CANCEL" });
    expect(dragOf(s)).toBe("idle");
    expect(s.context.dragSourceId).toBeNull();
  });
});

describe("carry: from drag.carrying", () => {
  const enterCarry = [
    { type: "SELECT" as const, elementId: "el-1" },
    carryStart,
  ];

  it("CARRY_COMMIT → idle, clears dragSourceId", () => {
    const s = walk(...enterCarry, { type: "CARRY_COMMIT" });
    expect(dragOf(s)).toBe("idle");
    expect(s.context.dragSourceId).toBeNull();
  });

  it("CARRY_CANCEL → idle, clears dragSourceId", () => {
    const s = walk(...enterCarry, { type: "CARRY_CANCEL" });
    expect(dragOf(s)).toBe("idle");
    expect(s.context.dragSourceId).toBeNull();
  });

  it("ESCAPE → idle, clears dragSourceId", () => {
    const s = walk(...enterCarry, { type: "ESCAPE" });
    expect(dragOf(s)).toBe("idle");
    expect(s.context.dragSourceId).toBeNull();
  });

  it("CARRY_START ignored while already carrying", () => {
    const s = walk(...enterCarry, {
      type: "CARRY_START",
      sourceId: "el-2",
    });
    expect(dragOf(s)).toBe("carrying");
    expect(s.context.dragSourceId).toBe("el-1");
  });

  it("DRAG_START ignored while carrying", () => {
    const s = walk(...enterCarry, { type: "DRAG_START", sourceId: "el-2" });
    expect(dragOf(s)).toBe("carrying");
    expect(s.context.dragSourceId).toBe("el-1");
  });
});

describe("carry/drag mutual exclusion", () => {
  it("CARRY_START ignored while dragging", () => {
    const s = walk({ type: "SELECT", elementId: "el-1" }, dragStart, {
      type: "CARRY_START",
      sourceId: "el-2",
    });
    expect(dragOf(s)).toBe("dragging");
    expect(s.context.dragSourceId).toBe("el-1");
  });

  it("CARRY_COMMIT ignored while dragging", () => {
    const s = walk({ type: "SELECT", elementId: "el-1" }, dragStart, {
      type: "CARRY_COMMIT",
    });
    expect(dragOf(s)).toBe("dragging");
    expect(s.context.dragSourceId).toBe("el-1");
  });

  it("CARRY_CANCEL ignored while dragging", () => {
    const s = walk({ type: "SELECT", elementId: "el-1" }, dragStart, {
      type: "CARRY_CANCEL",
    });
    expect(dragOf(s)).toBe("dragging");
    expect(s.context.dragSourceId).toBe("el-1");
  });

  it("DROP ignored while carrying", () => {
    const s = walk({ type: "SELECT", elementId: "el-1" }, carryStart, {
      type: "DROP",
      sourceParentId: "page",
      targetParentId: "page",
      fromIndex: 0,
      toIndex: 1,
    });
    expect(dragOf(s)).toBe("carrying");
    expect(s.context.dragSourceId).toBe("el-1");
  });

  it("DRAG_CANCEL ignored while carrying", () => {
    const s = walk({ type: "SELECT", elementId: "el-1" }, carryStart, {
      type: "DRAG_CANCEL",
    });
    expect(dragOf(s)).toBe("carrying");
    expect(s.context.dragSourceId).toBe("el-1");
  });
});

// --- slot-selected: exhaustive state × event matrix ---

const pointerOf = (s: { value: unknown }) => (s.value as MachineValue).pointer;

const enterSlotSelected = [
  { type: "SELECT" as const, elementId: "el-1" },
  { type: "SELECT_SLOT" as const, parentId: "card", slotKey: "body" },
];

describe("slot-selected: entry", () => {
  it("selected + SELECT_SLOT → slot-selected, assigns selectedSlot, clears selectedIds", () => {
    const s = walk(...enterSlotSelected);
    expect(pointerOf(s)).toBe("slot-selected");
    expect(s.context.selectedSlot).toEqual({
      parentId: "card",
      slotKey: "body",
    });
    expect(s.context.selectedIds.size).toBe(0);
    expect(s.context.lastSelectedId).toBe("el-1");
  });

  it("SELECT_SLOT from idle is ignored (guard: must be in selected)", () => {
    const s = walk({ type: "SELECT_SLOT", parentId: "card", slotKey: "body" });
    expect(pointerOf(s)).toBe("idle");
    expect(s.context.selectedSlot).toBeNull();
  });
});

describe("slot-selected: SELECT exits to selected, clears selectedSlot", () => {
  it("SELECT → selected, assigns new element, clears selectedSlot", () => {
    const s = walk(...enterSlotSelected, { type: "SELECT", elementId: "card" });
    expect(pointerOf(s)).toBe("selected");
    expect(s.context.selectedIds).toEqual(new Set(["card"]));
    expect(s.context.lastSelectedId).toBe("card");
    expect(s.context.selectedSlot).toBeNull();
  });
});

describe("slot-selected: ESCAPE exits to selected, clears selectedSlot", () => {
  it("ESCAPE → selected (element retained), selectedSlot cleared", () => {
    const s = walk(...enterSlotSelected, { type: "ESCAPE" });
    expect(pointerOf(s)).toBe("selected");
    expect(s.context.selectedIds).toEqual(new Set(["el-1"]));
    expect(s.context.lastSelectedId).toBe("el-1");
    expect(s.context.selectedSlot).toBeNull();
  });
});

describe("slot-selected: DESELECT exits to idle, clears everything", () => {
  it("DESELECT → idle, clears selectedIds and selectedSlot", () => {
    const s = walk(...enterSlotSelected, { type: "DESELECT" });
    expect(pointerOf(s)).toBe("idle");
    expect(s.context.selectedIds.size).toBe(0);
    expect(s.context.lastSelectedId).toBeNull();
    expect(s.context.selectedSlot).toBeNull();
  });
});

describe("slot-selected: REPLACE_SELECT clears selectedSlot", () => {
  it("REPLACE_SELECT with ids → selected, clears selectedSlot", () => {
    const s = walk(...enterSlotSelected, {
      type: "REPLACE_SELECT",
      elementIds: ["other"],
    });
    expect(pointerOf(s)).toBe("selected");
    expect(s.context.selectedIds).toEqual(new Set(["other"]));
    expect(s.context.selectedSlot).toBeNull();
  });

  it("REPLACE_SELECT with empty → idle, clears selectedSlot", () => {
    const s = walk(...enterSlotSelected, {
      type: "REPLACE_SELECT",
      elementIds: [],
    });
    expect(pointerOf(s)).toBe("idle");
    expect(s.context.selectedIds.size).toBe(0);
    expect(s.context.selectedSlot).toBeNull();
  });
});

describe("slot-selected: drag/carry entry clears selectedSlot, pointer yields", () => {
  it("DRAG_START while in slot-selected → drag.dragging, pointer.dragging, selectedSlot cleared, ring restored", () => {
    const s = walk(...enterSlotSelected, {
      type: "DRAG_START",
      sourceId: "el-1",
    });
    expect(dragOf(s)).toBe("dragging");
    expect(pointerOf(s)).toBe("dragging");
    expect(s.context.selectedSlot).toBeNull();
    expect(s.context.selectedIds).toEqual(new Set(["el-1"]));
  });

  it("CARRY_START while in slot-selected → drag.carrying, pointer.dragging, selectedSlot cleared, ring restored", () => {
    const s = walk(...enterSlotSelected, {
      type: "CARRY_START",
      sourceId: "el-1",
    });
    expect(dragOf(s)).toBe("carrying");
    expect(pointerOf(s)).toBe("dragging");
    expect(s.context.selectedSlot).toBeNull();
    expect(s.context.selectedIds).toEqual(new Set(["el-1"]));
  });
});

describe("selectedSlot is null after DESELECT from selected (not just slot-selected)", () => {
  it("selected + DESELECT never carries selectedSlot forward (invariant)", () => {
    const s = walk({ type: "SELECT", elementId: "el-1" }, { type: "DESELECT" });
    expect(s.context.selectedSlot).toBeNull();
  });
});

describe("selectedSlot cleared by top-level REPLACE_SELECT", () => {
  it("top-level REPLACE_SELECT while in slot-selected → selected, clears selectedSlot", () => {
    const s = walk(...enterSlotSelected, {
      type: "REPLACE_SELECT",
      elementIds: ["another"],
    });
    expect(pointerOf(s)).toBe("selected");
    expect(s.context.selectedSlot).toBeNull();
  });
});

describe("slot-selected: dropped events keep slot-selected intact", () => {
  const slotContext = { parentId: "card", slotKey: "body" };

  const droppedEvents: EditorEvent[] = [
    { type: "TOGGLE_SELECT", elementId: "el-2" },
    { type: "OPEN_POPOVER" },
    {
      type: "START_INLINE_EDIT",
      elementId: "el-1",
      propKey: "text",
      original: "Hello",
      trigger: "select",
    },
    { type: "OPEN_INSERT" },
  ];

  for (const event of droppedEvents) {
    it(`${event.type} is dropped — pointer stays slot-selected, selectedSlot unchanged`, () => {
      const s = walk(...enterSlotSelected, event);
      expect(pointerOf(s)).toBe("slot-selected");
      expect(s.context.selectedSlot).toEqual(slotContext);
    });
  }
});

// --- R1: selection yields — pointer region exits `selected` on drag/carry start ---
//
// Law: while drag is not idle, the pointer region must be OUT of `selected`
// (and `slot-selected`) so the shell's selection-chrome gates suppress the ring,
// label cluster, and box-model bands. The drag overlay is the sole source mark.
// Drop AND cancel restore the pointer to `selected`.

const drop = {
  type: "DROP" as const,
  sourceParentId: "page",
  targetParentId: "page",
  fromIndex: 0,
  toIndex: 1,
};

describe("R1: pointer yields entirely while dragging", () => {
  it("selected + DRAG_START → pointer.dragging (out of selected)", () => {
    const s = walk({ type: "SELECT", elementId: "el-1" }, dragStart);
    expect(pointerOf(s)).toBe("dragging");
    expect(dragOf(s)).toBe("dragging");
  });

  it("selected + CARRY_START → pointer.dragging (out of selected)", () => {
    const s = walk({ type: "SELECT", elementId: "el-1" }, carryStart);
    expect(pointerOf(s)).toBe("dragging");
    expect(dragOf(s)).toBe("carrying");
  });

  it("ring identity survives a drag round-trip — selectedIds untouched", () => {
    const before = walk({ type: "SELECT", elementId: "el-1" }, dragStart);
    expect(before.context.selectedIds).toEqual(new Set(["el-1"]));
  });

  it("DRAG_START blocked while editing — pointer stays editing, drag idle", () => {
    const s = walk(
      { type: "SELECT", elementId: "el-1" },
      { type: "OPEN_POPOVER" },
      dragStart,
    );
    expect(pointerOf(s)).toBe("editing");
    expect(dragOf(s)).toBe("idle");
  });

  it("CARRY_START blocked while editing — pointer stays editing, drag idle", () => {
    const s = walk(
      { type: "SELECT", elementId: "el-1" },
      { type: "OPEN_POPOVER" },
      carryStart,
    );
    expect(pointerOf(s)).toBe("editing");
    expect(dragOf(s)).toBe("idle");
  });
});

describe("R1: drop and cancel restore the pointer to selected", () => {
  const enterDrag = [{ type: "SELECT" as const, elementId: "el-1" }, dragStart];
  const enterCarry = [
    { type: "SELECT" as const, elementId: "el-1" },
    carryStart,
  ];

  it("DROP → pointer.selected, ring back, both regions idle/selected", () => {
    const s = walk(...enterDrag, drop);
    expect(pointerOf(s)).toBe("selected");
    expect(dragOf(s)).toBe("idle");
    expect(s.context.selectedIds).toEqual(new Set(["el-1"]));
  });

  it("DRAG_CANCEL → pointer.selected, ring back", () => {
    const s = walk(...enterDrag, { type: "DRAG_CANCEL" });
    expect(pointerOf(s)).toBe("selected");
    expect(dragOf(s)).toBe("idle");
    expect(s.context.selectedIds).toEqual(new Set(["el-1"]));
  });

  it("CARRY_COMMIT → pointer.selected, ring back", () => {
    const s = walk(...enterCarry, { type: "CARRY_COMMIT" });
    expect(pointerOf(s)).toBe("selected");
    expect(dragOf(s)).toBe("idle");
    expect(s.context.selectedIds).toEqual(new Set(["el-1"]));
  });

  it("CARRY_CANCEL → pointer.selected, ring back", () => {
    const s = walk(...enterCarry, { type: "CARRY_CANCEL" });
    expect(pointerOf(s)).toBe("selected");
    expect(dragOf(s)).toBe("idle");
    expect(s.context.selectedIds).toEqual(new Set(["el-1"]));
  });

  it("ESCAPE while carrying → pointer.selected (not deselect), ring back", () => {
    const s = walk(...enterCarry, { type: "ESCAPE" });
    expect(pointerOf(s)).toBe("selected");
    expect(dragOf(s)).toBe("idle");
    expect(s.context.selectedIds).toEqual(new Set(["el-1"]));
  });
});

describe("R1: slot-selected yields too", () => {
  it("slot-selected + DRAG_START → pointer.dragging, slot cleared, ring restored", () => {
    const s = walk(...enterSlotSelected, dragStart);
    expect(pointerOf(s)).toBe("dragging");
    expect(dragOf(s)).toBe("dragging");
    expect(s.context.selectedSlot).toBeNull();
    expect(s.context.selectedIds).toEqual(new Set(["el-1"]));
  });

  it("slot-selected drag round-trips back to element selection on DROP", () => {
    const s = walk(...enterSlotSelected, dragStart, drop);
    expect(pointerOf(s)).toBe("selected");
    expect(s.context.selectedIds).toEqual(new Set(["el-1"]));
    expect(s.context.selectedSlot).toBeNull();
  });
});

describe("R1: terminating drag events are no-ops outside the dragging pointer state", () => {
  const dragEnders: EditorEvent[] = [
    drop,
    { type: "DRAG_CANCEL" },
    { type: "CARRY_COMMIT" },
    { type: "CARRY_CANCEL" },
  ];

  for (const event of dragEnders) {
    it(`${event.type} from pointer.selected leaves pointer.selected intact`, () => {
      const s = walk({ type: "SELECT", elementId: "el-1" }, event);
      expect(pointerOf(s)).toBe("selected");
      expect(s.context.selectedIds).toEqual(new Set(["el-1"]));
    });

    it(`${event.type} from pointer.idle leaves pointer.idle intact`, () => {
      const s = walk(event);
      expect(pointerOf(s)).toBe("idle");
    });
  }
});
