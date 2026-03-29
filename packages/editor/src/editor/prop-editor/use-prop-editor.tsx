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
import { useDoubleClickEdit } from "./use-double-click-edit.js";
import { useInlineEdit } from "./inline-input.js";
import { PropPopover } from "./prop-popover.js";

type UsePropEditorProps = {
  registry: FiberRegistry | null;
  spec: Spec;
  state: EditorSnapshot;
  send: (event: EditorEvent) => void;
  onSpecChange?: (spec: Spec) => void;
  getPropSchema?: (type: string) => ZodTypeAny | undefined;
};

/** Orchestrates all prop-editing interactions. Returns popover element for the overlay. */
export function usePropEditor({
  registry,
  spec,
  state,
  send,
  onSpecChange,
  getPropSchema,
}: UsePropEditorProps): ReactNode {
  // --- Double-click text → DOUBLE_CLICK_TEXT ---
  useDoubleClickEdit({ registry, spec, getPropSchema, send });

  // --- Inline editing lifecycle ---
  const editing = state.context.editing;
  const inline = editing?.mode === "inline" ? (editing as InlineEditing) : null;

  const commitInline = useCallback(
    (value: string) => {
      if (inline && onSpecChange) {
        editProp(spec, inline.elementId, inline.propKey, value).map(
          onSpecChange,
        );
      }
      send({ type: "COMMIT_EDIT", newValue: value });
    },
    [inline, spec, onSpecChange, send],
  );

  const cancelInline = useCallback(() => send({ type: "CANCEL_EDIT" }), [send]);

  useInlineEdit({
    registry,
    elementId: inline?.elementId ?? "",
    original: inline?.original ?? "",
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
      if (!editing || !onSpecChange) return;
      editProp(spec, editing.elementId, propKey, value).map(onSpecChange);
    },
    [editing, spec, onSpecChange],
  );

  const handleClose = useCallback(
    () => send({ type: "CANCEL_EDIT" }),
    [send],
  );

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
