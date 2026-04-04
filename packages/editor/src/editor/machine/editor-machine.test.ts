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
  },
  "pointer.hovering": (ctx) => {
    expect(ctx.hoveredId).not.toBeNull();
  },
  "pointer.selected": (ctx) => {
    expect(ctx.selectedIds.size).toBeGreaterThan(0);
    expect(ctx.editing).toBeNull();
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
};

// --- Event samples (one per event type, flat array for model traversal) ---

const sampleEvents = [
  { type: "HOVER" as const, elementId: "el-1" },
  { type: "UNHOVER" as const },
  { type: "SELECT" as const, elementId: "el-1" },
  { type: "MULTI_SELECT" as const, elementId: "el-2" },
  { type: "DESELECT" as const },
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
    expect((s.value as MachineValue).pointer).toBe("selected");
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
    expect((s.value as MachineValue).pointer).toBe("selected");
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

  it("MULTI_SELECT from idle transitions to selected", () => {
    const s = walk({ type: "MULTI_SELECT", elementId: "a" });
    expect((s.value as MachineValue).pointer).toBe("selected");
    expect(s.context.selectedIds).toEqual(new Set(["a"]));
    expect(s.context.lastSelectedId).toBe("a");
  });

  it("MULTI_SELECT adds to set", () => {
    const s = walk(
      { type: "SELECT", elementId: "a" },
      { type: "MULTI_SELECT", elementId: "b" },
    );
    expect(s.context.selectedIds).toEqual(new Set(["a", "b"]));
    expect(s.context.lastSelectedId).toBe("b");
  });

  it("MULTI_SELECT removes existing element", () => {
    const s = walk(
      { type: "SELECT", elementId: "a" },
      { type: "MULTI_SELECT", elementId: "b" },
      { type: "MULTI_SELECT", elementId: "a" },
    );
    expect(s.context.selectedIds).toEqual(new Set(["b"]));
    expect(s.context.lastSelectedId).toBe("b");
  });

  it("MULTI_SELECT last element transitions to idle", () => {
    const s = walk(
      { type: "SELECT", elementId: "a" },
      { type: "MULTI_SELECT", elementId: "a" },
    );
    expect((s.value as MachineValue).pointer).toBe("idle");
    expect(s.context.selectedIds.size).toBe(0);
    expect(s.context.lastSelectedId).toBeNull();
  });

  it("DESELECT clears multi-selection", () => {
    const s = walk(
      { type: "SELECT", elementId: "a" },
      { type: "MULTI_SELECT", elementId: "b" },
      { type: "DESELECT" },
    );
    expect(s.context.selectedIds.size).toBe(0);
    expect(s.context.lastSelectedId).toBeNull();
  });

  it("OPEN_POPOVER collapses multi to singleton", () => {
    const s = walk(
      { type: "SELECT", elementId: "a" },
      { type: "MULTI_SELECT", elementId: "b" },
      { type: "OPEN_POPOVER" },
    );
    expect(s.context.selectedIds).toEqual(new Set(["b"]));
    expect(s.context.editing).toEqual({
      elementId: "b",
      mode: "popover",
    });
  });
});
