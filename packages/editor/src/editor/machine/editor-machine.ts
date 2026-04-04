import { setup, assign, type SnapshotFrom } from "xstate";

// --- Context ---

type InlineEditBase = {
  elementId: string;
  mode: "inline";
  propKey: string;
  original: string;
};

export type InlineEditing = InlineEditBase &
  ({ trigger: "select" } | { trigger: "replace"; char: string });

export type PopoverEditing = {
  elementId: string;
  mode: "popover";
};

export type Editing = InlineEditing | PopoverEditing;

export type EditorContext = {
  hoveredId: string | null;
  selectedId: string | null;
  editing: Editing | null;
  dragSourceId: string | null;
};

// --- Events ---

export type EditorEvent =
  | { type: "HOVER"; elementId: string }
  | { type: "UNHOVER" }
  | { type: "SELECT"; elementId: string }
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
      sourceParentId: string;
      targetParentId: string;
      fromIndex: number;
      toIndex: number;
    }
  | { type: "DRAG_CANCEL" }
  | { type: "OPEN_INSERT" }
  | { type: "ESCAPE" };

// --- Context predicates ---

const isEditing = (ctx: EditorContext) => ctx.editing !== null;
const isDragging = (ctx: EditorContext) => ctx.dragSourceId !== null;

// --- Machine ---

export const editorMachine = setup({
  types: {
    context: {} as EditorContext,
    events: {} as EditorEvent,
  },
  guards: {
    isDifferentHover: ({ context, event }) =>
      event.type === "HOVER" && context.hoveredId !== event.elementId,
    notEditing: ({ context }) => !isEditing(context),
    notDragging: ({ context }) => !isDragging(context),
  },
}).createMachine({
  id: "editor",
  type: "parallel",
  context: {
    hoveredId: null,
    selectedId: null,
    editing: null,
    dragSourceId: null,
  },
  states: {
    pointer: {
      initial: "idle",
      states: {
        idle: {
          on: {
            HOVER: {
              target: "hovering",
              actions: assign({ hoveredId: ({ event }) => event.elementId }),
            },
            SELECT: {
              target: "selected",
              actions: assign({
                selectedId: ({ event }) => event.elementId,
              }),
            },
          },
        },
        hovering: {
          on: {
            HOVER: {
              guard: "isDifferentHover",
              actions: assign({ hoveredId: ({ event }) => event.elementId }),
            },
            UNHOVER: {
              target: "idle",
              actions: assign({ hoveredId: null }),
            },
            SELECT: {
              target: "selected",
              actions: assign({
                selectedId: ({ event }) => event.elementId,
                hoveredId: null,
              }),
            },
          },
        },
        selected: {
          on: {
            SELECT: {
              actions: assign({
                selectedId: ({ event }) => event.elementId,
              }),
            },
            DESELECT: {
              target: "idle",
              actions: assign({ selectedId: null, hoveredId: null }),
            },
            ESCAPE: {
              guard: "notEditing",
              target: "idle",
              actions: assign({ selectedId: null, hoveredId: null }),
            },
            OPEN_POPOVER: {
              guard: "notDragging",
              target: "editing",
              actions: assign({
                editing: ({ context }) =>
                  context.selectedId
                    ? { elementId: context.selectedId, mode: "popover" }
                    : null,
              }),
            },
            OPEN_INSERT: {
              guard: "notDragging",
              target: "inserting",
            },
            START_INLINE_EDIT: {
              guard: "notDragging",
              target: "editing",
              actions: assign({
                editing: ({ event }) =>
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
              }),
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
              actions: assign({
                selectedId: ({ event }) => event.elementId,
              }),
            },
            DESELECT: {
              target: "idle",
              actions: assign({ selectedId: null, hoveredId: null }),
            },
            ESCAPE: {
              target: "selected",
            },
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
