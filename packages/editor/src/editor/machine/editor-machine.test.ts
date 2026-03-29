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
    expect(ctx.selectedId).toBeNull();
  },
  "pointer.hovering": (ctx) => {
    expect(ctx.hoveredId).not.toBeNull();
  },
  "pointer.selected": (ctx) => {
    expect(ctx.selectedId).not.toBeNull();
    expect(ctx.editing).toBeNull();
  },
  "pointer.editing": (ctx) => {
    expect(ctx.editing).not.toBeNull();
    expect(ctx.selectedId).not.toBeNull();
  },
  "drag.idle": (ctx) => {
    expect(ctx.dragSourceId).toBeNull();
  },
  "drag.dragging": (ctx) => {
    expect(ctx.dragSourceId).not.toBeNull();
  },
  "history.closed": (ctx) => {
    expect(ctx.historyOpen).toBe(false);
  },
  "history.open": (ctx) => {
    expect(ctx.historyOpen).toBe(true);
  },
};

// --- Event samples (one per event type, flat array for model traversal) ---

const sampleEvents = [
  { type: "HOVER" as const, elementId: "el-1" },
  { type: "UNHOVER" as const },
  { type: "SELECT" as const, elementId: "el-1" },
  { type: "DESELECT" as const },
  { type: "OPEN_POPOVER" as const },
  {
    type: "DOUBLE_CLICK_TEXT" as const,
    elementId: "el-1",
    propKey: "text",
    original: "Hello",
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
  { type: "OPEN_HISTORY" as const },
  { type: "CLOSE_HISTORY" as const },
  { type: "UNDO" as const },
  { type: "REDO" as const },
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

type MachineValue = { pointer: string; drag: string; history: string };

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
        type: "DOUBLE_CLICK_TEXT",
        elementId: "x",
        propKey: "text",
        original: "Hi",
      },
    );
    expect((s.value as MachineValue).pointer).toBe("selected");
    expect(s.context.editing).toBeNull();
  });
});

// --- History substate ---

describe("history substate", () => {
  it("starts closed", () => {
    const s = walk();
    expect((s.value as MachineValue).history).toBe("closed");
    expect(s.context.historyOpen).toBe(false);
  });

  it("OPEN_HISTORY transitions closed → open", () => {
    const s = walk({ type: "OPEN_HISTORY" });
    expect((s.value as MachineValue).history).toBe("open");
    expect(s.context.historyOpen).toBe(true);
  });

  it("ESCAPE in history.open transitions to closed", () => {
    const s = walk({ type: "OPEN_HISTORY" }, { type: "ESCAPE" });
    expect((s.value as MachineValue).history).toBe("closed");
    expect(s.context.historyOpen).toBe(false);
  });

  it("CLOSE_HISTORY transitions open → closed", () => {
    const s = walk({ type: "OPEN_HISTORY" }, { type: "CLOSE_HISTORY" });
    expect((s.value as MachineValue).history).toBe("closed");
    expect(s.context.historyOpen).toBe(false);
  });

  it("OPEN_HISTORY ignored when already open", () => {
    const s = walk({ type: "OPEN_HISTORY" }, { type: "OPEN_HISTORY" });
    expect((s.value as MachineValue).history).toBe("open");
  });
});

// --- ESCAPE priority across parallel regions ---

describe("ESCAPE priority", () => {
  it("history open + pointer selected → only history closes, pointer stays selected", () => {
    const s = walk(
      { type: "SELECT", elementId: "x" },
      { type: "OPEN_HISTORY" },
      { type: "ESCAPE" },
    );
    expect((s.value as MachineValue).history).toBe("closed");
    expect((s.value as MachineValue).pointer).toBe("selected");
    expect(s.context.selectedId).toBe("x");
  });

  it("history open + pointer editing → only history closes, pointer stays editing", () => {
    const s = walk(
      { type: "SELECT", elementId: "x" },
      { type: "OPEN_POPOVER" },
      { type: "OPEN_HISTORY" },
      { type: "ESCAPE" },
    );
    expect((s.value as MachineValue).history).toBe("closed");
    expect((s.value as MachineValue).pointer).toBe("editing");
    expect(s.context.editing).not.toBeNull();
  });

  it("history closed + pointer selected → ESCAPE deselects", () => {
    const s = walk({ type: "SELECT", elementId: "x" }, { type: "ESCAPE" });
    expect((s.value as MachineValue).history).toBe("closed");
    expect((s.value as MachineValue).pointer).toBe("idle");
    expect(s.context.selectedId).toBeNull();
  });

  it("history closed + pointer editing → ESCAPE cancels edit", () => {
    const s = walk(
      { type: "SELECT", elementId: "x" },
      { type: "OPEN_POPOVER" },
      { type: "ESCAPE" },
    );
    expect((s.value as MachineValue).history).toBe("closed");
    expect((s.value as MachineValue).pointer).toBe("selected");
    expect(s.context.editing).toBeNull();
  });

  it("second ESCAPE after history close deselects pointer", () => {
    const s = walk(
      { type: "SELECT", elementId: "x" },
      { type: "OPEN_HISTORY" },
      { type: "ESCAPE" }, // closes history
      { type: "ESCAPE" }, // deselects pointer
    );
    expect((s.value as MachineValue).history).toBe("closed");
    expect((s.value as MachineValue).pointer).toBe("idle");
    expect(s.context.selectedId).toBeNull();
  });
});

// --- Pass-through events ---

describe("pass-through events", () => {
  it("UNDO accepted without state change", () => {
    const before = walk();
    const after = walk({ type: "UNDO" });
    expect(after.value).toEqual(before.value);
  });

  it("REDO accepted without state change", () => {
    const before = walk();
    const after = walk({ type: "REDO" });
    expect(after.value).toEqual(before.value);
  });
});
