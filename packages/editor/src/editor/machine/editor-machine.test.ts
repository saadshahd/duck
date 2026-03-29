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

// --- Cross-region exclusivity ---

describe("exclusivity guards", () => {
  const walk = (...events: EditorEvent[]) => {
    const actor = createActor(editorMachine);
    actor.start();
    for (const e of events) actor.send(e);
    return actor.getSnapshot();
  };

  it("drag blocked while editing", () => {
    const s = walk(
      { type: "HOVER", elementId: "x" },
      { type: "SELECT", elementId: "x" },
      { type: "OPEN_POPOVER" },
      { type: "DRAG_START", sourceId: "x" },
    );
    expect((s.value as { drag: string }).drag).toBe("idle");
  });

  it("popover blocked while dragging", () => {
    const s = walk(
      { type: "HOVER", elementId: "x" },
      { type: "SELECT", elementId: "x" },
      { type: "DRAG_START", sourceId: "x" },
      { type: "OPEN_POPOVER" },
    );
    expect((s.value as { pointer: string }).pointer).toBe("selected");
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
    expect((s.value as { pointer: string }).pointer).toBe("selected");
    expect(s.context.editing).toBeNull();
  });
});
