import { setup, assign, type SnapshotFrom } from "xstate";
import { Target } from "./target.js";

// --- Context ---

type InlineEditBase = {
  elementId: string;
  mode: "inline";
  propKey: string;
  original: string;
};

export type InlineEditing = InlineEditBase &
  ({ trigger: "select" } | { trigger: "replace"; char: string });

type PopoverEditing = {
  elementId: string;
  mode: "popover";
};

type Editing = InlineEditing | PopoverEditing;

export type EditorContext = {
  selection: Target | null;
  hovered: Target | null;
  editing: Editing | null;
  dragSourceId: string | null;
};

// --- Events ---

export type EditorEvent =
  | { type: "HOVER"; target: Target | null }
  | { type: "SELECT"; target: Target }
  | { type: "DESELECT" }
  | { type: "OPEN_POPOVER" }
  | ({
      type: "START_INLINE_EDIT";
      elementId: string;
      propKey: string;
      original: string;
    } & ({ trigger: "select" } | { trigger: "replace"; char: string }))
  | { type: "COMMIT_EDIT"; newValue: unknown }
  | { type: "CANCEL_EDIT" }
  | { type: "DRAG_START"; sourceId: string }
  | {
      type: "DROP";
      sourceParentId: string | null;
      targetParentId: string | null;
      fromIndex: number;
      toIndex: number;
    }
  | { type: "DRAG_CANCEL" }
  | { type: "OPEN_INSERT" }
  | { type: "ESCAPE" };

// --- Context predicates ---

const isEditing = (ctx: EditorContext) => ctx.editing !== null;
const isDragging = (ctx: EditorContext) => ctx.dragSourceId !== null;
const selectionIsSlot = (ctx: EditorContext) =>
  ctx.selection?.kind === "slot";

// --- Machine ---

export const editorMachine = setup({
  types: {
    context: {} as EditorContext,
    events: {} as EditorEvent,
  },
  guards: {
    isDifferentHover: ({ context, event }) =>
      event.type === "HOVER" && !Target.equals(context.hovered, event.target),
    notEditing: ({ context }) => !isEditing(context),
    notDragging: ({ context }) => !isDragging(context),
    selectionIsSlotAndNotDragging: ({ context }) =>
      selectionIsSlot(context) && !isDragging(context),
  },
}).createMachine({
  id: "editor",
  type: "parallel",
  context: {
    selection: null,
    hovered: null,
    editing: null,
    dragSourceId: null,
  },
  states: {
    pointer: {
      initial: "idle",
      on: {
        DESELECT: {
          target: ".idle",
          actions: assign(() => ({
            selection: null,
            hovered: null,
            editing: null,
          })),
        },
      },
      states: {
        idle: {
          on: {
            HOVER: {
              target: "hovering",
              guard: ({ event }) => event.target !== null,
              actions: assign({ hovered: ({ event }) => event.target }),
            },
            SELECT: {
              target: "selected",
              actions: assign(({ event }) => ({
                selection: event.target,
                hovered: null,
                editing: null,
              })),
            },
            OPEN_INSERT: {
              guard: "selectionIsSlotAndNotDragging",
              target: "inserting",
            },
          },
        },
        hovering: {
          on: {
            HOVER: [
              {
                guard: ({ event }) => event.target === null,
                target: "idle",
                actions: assign({ hovered: null }),
              },
              {
                guard: "isDifferentHover",
                actions: assign({ hovered: ({ event }) => event.target }),
              },
            ],
            SELECT: {
              target: "selected",
              actions: assign(({ event }) => ({
                selection: event.target,
                hovered: null,
                editing: null,
              })),
            },
          },
        },
        selected: {
          on: {
            SELECT: {
              actions: assign(({ event }) => ({
                selection: event.target,
                editing: null,
              })),
            },
            HOVER: {
              actions: assign({ hovered: ({ event }) => event.target }),
            },
            ESCAPE: {
              guard: "notEditing",
              target: "idle",
              actions: assign(() => ({
                selection: null,
                hovered: null,
              })),
            },
            OPEN_POPOVER: {
              guard: ({ context }) =>
                !isDragging(context) && context.selection?.kind === "element",
              target: "editing",
              actions: assign(({ context }) => ({
                editing:
                  context.selection?.kind === "element"
                    ? {
                        elementId: context.selection.elementId,
                        mode: "popover" as const,
                      }
                    : null,
              })),
            },
            OPEN_INSERT: {
              guard: "notDragging",
              target: "inserting",
            },
            START_INLINE_EDIT: {
              guard: "notDragging",
              target: "editing",
              actions: assign(({ event }) => ({
                editing:
                  event.trigger === "replace"
                    ? {
                        elementId: event.elementId,
                        mode: "inline" as const,
                        propKey: event.propKey,
                        original: event.original,
                        trigger: "replace" as const,
                        char: event.char,
                      }
                    : {
                        elementId: event.elementId,
                        mode: "inline" as const,
                        propKey: event.propKey,
                        original: event.original,
                        trigger: "select" as const,
                      },
              })),
            },
          },
        },
        editing: {
          on: {
            COMMIT_EDIT: {
              target: "selected",
              actions: assign({ editing: null }),
            },
            CANCEL_EDIT: {
              target: "selected",
              actions: assign({ editing: null }),
            },
            ESCAPE: {
              target: "selected",
              actions: assign({ editing: null }),
            },
          },
        },
        inserting: {
          on: {
            SELECT: {
              target: "selected",
              actions: assign(({ event }) => ({
                selection: event.target,
              })),
            },
            DESELECT: {
              target: "idle",
              actions: assign(() => ({
                selection: null,
                hovered: null,
              })),
            },
            ESCAPE: [
              {
                guard: ({ context }) => selectionIsSlot(context),
                target: "selected",
              },
              {
                target: "selected",
              },
            ],
          },
        },
      },
    },
    drag: {
      initial: "idle",
      states: {
        idle: {
          on: {
            DRAG_START: {
              guard: "notEditing",
              target: "dragging",
              actions: assign({
                dragSourceId: ({ event }) => event.sourceId,
              }),
            },
          },
        },
        dragging: {
          on: {
            DROP: {
              target: "idle",
              actions: assign({ dragSourceId: null }),
            },
            DRAG_CANCEL: {
              target: "idle",
              actions: assign({ dragSourceId: null }),
            },
          },
        },
      },
    },
  },
});

export type EditorSnapshot = SnapshotFrom<typeof editorMachine>;
