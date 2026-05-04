import { setup, assign, type SnapshotFrom } from "xstate";
import { Selection } from "./selection-model.js";

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
  hoveredId: string | null;
  selectedIds: ReadonlySet<string>;
  lastSelectedId: string | null;
  editing: Editing | null;
  dragSourceId: string | null;
};

// --- Events ---

export type EditorEvent =
  | { type: "HOVER"; elementId: string }
  | { type: "UNHOVER" }
  | { type: "SELECT"; elementId: string }
  | { type: "REPLACE_SELECT"; elementIds: string[] }
  | { type: "TOGGLE_SELECT"; elementId: string }
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
    multiSelectEmptiesSet: ({ context, event }) =>
      event.type === "TOGGLE_SELECT" &&
      Selection.wouldEmpty(context, event.elementId),
    replaceSelectEmpty: ({ event }) =>
      event.type === "REPLACE_SELECT" && event.elementIds.length === 0,
  },
}).createMachine({
  id: "editor",
  type: "parallel",
  context: {
    hoveredId: null,
    selectedIds: new Set<string>(),
    lastSelectedId: null,
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
            ...Selection.clear(),
            hoveredId: null,
            editing: null,
          })),
        },
        REPLACE_SELECT: [
          {
            guard: "replaceSelectEmpty",
            target: ".idle",
            actions: assign(() => ({
              ...Selection.clear(),
              hoveredId: null,
              editing: null,
            })),
          },
          {
            target: ".selected",
            actions: assign(({ event }) => ({
              ...Selection.ofSet(
                (event as { elementIds: string[] }).elementIds,
              ),
              editing: null,
            })),
          },
        ],
      },
      states: {
        idle: {
          on: {
            HOVER: {
              target: "hovering",
              actions: assign({ hoveredId: ({ event }) => event.elementId }),
            },
            SELECT: {
              target: "selected",
              actions: assign(({ event }) => Selection.of(event.elementId)),
            },
            TOGGLE_SELECT: {
              target: "selected",
              actions: assign(({ event }) => Selection.of(event.elementId)),
            },
            REPLACE_SELECT: {
              target: "selected",
              actions: assign(({ event }) => Selection.ofSet(event.elementIds)),
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
              actions: assign(({ event }) => ({
                ...Selection.of(event.elementId),
                hoveredId: null,
              })),
            },
            TOGGLE_SELECT: {
              target: "selected",
              actions: assign(({ event }) => ({
                ...Selection.of(event.elementId),
                hoveredId: null,
              })),
            },
            REPLACE_SELECT: {
              target: "selected",
              actions: assign(({ event }) => ({
                ...Selection.ofSet(event.elementIds),
                hoveredId: null,
              })),
            },
          },
        },
        selected: {
          on: {
            SELECT: {
              actions: assign(({ event }) => Selection.of(event.elementId)),
            },
            TOGGLE_SELECT: [
              {
                guard: "multiSelectEmptiesSet",
                target: "idle",
                actions: assign(() => ({
                  ...Selection.clear(),
                  hoveredId: null,
                })),
              },
              {
                actions: assign(({ context, event }) =>
                  Selection.toggle(context, event.elementId),
                ),
              },
            ],
            REPLACE_SELECT: [
              {
                guard: "replaceSelectEmpty",
                target: "idle",
                actions: assign(() => ({
                  ...Selection.clear(),
                  hoveredId: null,
                })),
              },
              {
                actions: assign(({ event }) =>
                  Selection.ofSet(
                    (event as { elementIds: string[] }).elementIds,
                  ),
                ),
              },
            ],
            DESELECT: {
              target: "idle",
              actions: assign(() => ({
                ...Selection.clear(),
                hoveredId: null,
              })),
            },
            ESCAPE: {
              guard: "notEditing",
              target: "idle",
              actions: assign(() => ({
                ...Selection.clear(),
                hoveredId: null,
              })),
            },
            OPEN_POPOVER: {
              guard: "notDragging",
              target: "editing",
              actions: assign(({ context }) => ({
                ...Selection.collapseToLast(context),
                editing: context.lastSelectedId
                  ? { elementId: context.lastSelectedId, mode: "popover" }
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
              actions: assign(({ context, event }) => ({
                ...Selection.collapseToLast(context),
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
              actions: assign(({ event }) => Selection.of(event.elementId)),
            },
            DESELECT: {
              target: "idle",
              actions: assign(() => ({
                ...Selection.clear(),
                hoveredId: null,
              })),
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
