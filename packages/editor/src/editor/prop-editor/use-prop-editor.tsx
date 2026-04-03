import { useCallback, type ReactNode } from "react";
import type { Spec } from "@json-render/core";
import type { ZodTypeAny } from "zod";
import type { FiberRegistry } from "../fiber/index.js";
import type {
  EditorEvent,
  EditorSnapshot,
  InlineEditing,
} from "../machine/index.js";
import { editProp } from "../spec-ops/index.js";
import type { SpecPush } from "../types.js";
import { useDoubleClickEdit } from "./use-double-click-edit.js";
import { useKeyboardEdit } from "./use-keyboard-edit.js";
import { useInlineEdit } from "./inline-input.js";
import { PropPopover } from "./prop-popover.js";

type UsePropEditorProps = {
  registry: FiberRegistry | null;
  spec: Spec;
  state: EditorSnapshot;
  send: (event: EditorEvent) => void;
  push: SpecPush;
  getPropSchema?: (type: string) => ZodTypeAny | undefined;
};

/** Orchestrates all prop-editing interactions. Returns popover element for the overlay. */
export function usePropEditor({
  registry,
  spec,
  state,
  send,
  push,
  getPropSchema,
}: UsePropEditorProps): ReactNode {
  useDoubleClickEdit({ registry, spec, getPropSchema, send });

  const { pointer } = state.value as { pointer: string };
  const { selectedId } = state.context;
  useKeyboardEdit({ spec, selectedId, pointer, getPropSchema, send });

  // --- Inline editing lifecycle ---
  const editing = state.context.editing;
  const inline = editing?.mode === "inline" ? (editing as InlineEditing) : null;

  const commitInline = useCallback(
    (value: string) => {
      if (inline) {
        editProp(spec, inline.elementId, inline.propKey, value).map((next) =>
          push(
            next,
            `Edited text: "${String(value).slice(0, 30)}"`,
            `prop:${inline.elementId}`,
          ),
        );
      }
      send({ type: "COMMIT_EDIT", newValue: value });
    },
    [inline, spec, push, send],
  );

  const cancelInline = useCallback(() => send({ type: "CANCEL_EDIT" }), [send]);

  useInlineEdit({
    registry,
    editing: inline,
    onCommit: commitInline,
    onCancel: cancelInline,
  });

  // --- Popover editing ---
  const popoverSchema =
    editing?.mode === "popover" && getPropSchema
      ? getPropSchema(spec.elements[editing.elementId]?.type)
      : undefined;

  const handlePropChange = useCallback(
    (propKey: string, value: unknown) => {
      if (!editing) return;
      editProp(spec, editing.elementId, propKey, value).map((next) =>
        push(next, `Changed ${propKey}`, `prop:${editing.elementId}`),
      );
    },
    [editing, spec, push],
  );

  const handleClose = useCallback(() => send({ type: "CANCEL_EDIT" }), [send]);

  if (!editing || editing.mode !== "popover" || !popoverSchema || !registry)
    return null;

  return (
    <PropPopover
      registry={registry}
      spec={spec}
      elementId={editing.elementId}
      schema={popoverSchema}
      onPropChange={handlePropChange}
      onClose={handleClose}
    />
  );
}
