import { useCallback, type ReactNode } from "react";
import type { Config, Data } from "@puckeditor/core";
import { findById } from "@duck/spec";
import type { FiberRegistry } from "../fiber/index.js";
import type {
  EditorEvent,
  EditorSnapshot,
  InlineEditing,
} from "../machine/index.js";
import { editProp } from "../spec-ops/index.js";
import type { DataPush } from "../types.js";
import { useDoubleClickEdit } from "./use-double-click-edit.js";
import { useKeyboardEdit } from "./use-keyboard-edit.js";
import { useInlineEdit } from "./inline-input.js";
import { PropPopover } from "./prop-popover.js";
import { useResolvedFields } from "./use-resolved-fields.js";

type UsePropEditorProps = {
  registry: FiberRegistry | null;
  data: Data;
  config: Config;
  state: EditorSnapshot;
  send: (event: EditorEvent) => void;
  push: DataPush;
};

/** Orchestrates all prop-editing interactions. Returns popover element for the overlay. */
export function usePropEditor({
  registry,
  data,
  config,
  state,
  send,
  push,
}: UsePropEditorProps): ReactNode {
  useDoubleClickEdit({ registry, data, config, send });

  const { pointer } = state.value as { pointer: string };
  const { lastSelectedId } = state.context;
  useKeyboardEdit({ data, config, lastSelectedId, pointer, send });

  // --- Inline editing lifecycle ---
  const editing = state.context.editing;
  const inline = editing?.mode === "inline" ? (editing as InlineEditing) : null;

  const commitInline = useCallback(
    (value: string) => {
      if (inline) {
        editProp(data, inline.elementId, [inline.propKey], value, config).map(
          (next) =>
            push(
              next,
              `Edited text: "${String(value).slice(0, 30)}"`,
              `prop:${inline.elementId}`,
            ),
        );
      }
      send({ type: "COMMIT_EDIT", newValue: value });
    },
    [inline, data, config, push, send],
  );

  const cancelInline = useCallback(() => send({ type: "CANCEL_EDIT" }), [send]);

  useInlineEdit({
    registry,
    editing: inline,
    onCommit: commitInline,
    onCancel: cancelInline,
  });

  // --- Popover editing ---
  const popoverComponent =
    editing?.mode === "popover" ? findById(data, editing.elementId) : null;

  const { fields: popoverFields } = useResolvedFields(popoverComponent, config);

  const handlePropChange = useCallback(
    (propKey: string, value: unknown) => {
      if (!editing) return;
      editProp(data, editing.elementId, [propKey], value, config).map((next) =>
        push(next, `Changed ${propKey}`, `prop:${editing.elementId}`),
      );
    },
    [editing, data, config, push],
  );

  const handleClose = useCallback(() => send({ type: "CANCEL_EDIT" }), [send]);

  if (
    !editing ||
    editing.mode !== "popover" ||
    !popoverComponent ||
    !registry
  ) {
    return null;
  }

  return (
    <PropPopover
      registry={registry}
      component={popoverComponent}
      fields={popoverFields}
      onPropChange={handlePropChange}
      onClose={handleClose}
    />
  );
}
