import { useCallback, type ReactNode } from "react";
import type { Config, Data, Metadata } from "@puckeditor/core";
import { findById } from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import type {
  EditorEvent,
  EditorSnapshot,
  InlineEditing,
} from "../machine/index.js";
import { editProp } from "../spec-ops/index.js";
import type { DataPush, ResolveOpEmit } from "../types.js";
import { emitResolveOp } from "../resolve-op.js";
import { useDoubleClickEdit } from "./use-double-click-edit.js";
import { useKeyboardEdit } from "./use-keyboard-edit.js";
import { useInlineEdit } from "./inline-input.js";
import { PropPopover } from "./prop-popover.js";
import { useResolvedFields } from "./use-resolved-fields.js";

type UsePropEditorProps = {
  registry: FiberRegistry | null;
  data: Data;
  config: Config;
  metadata?: Metadata;
  state: EditorSnapshot;
  send: (event: EditorEvent) => void;
  push: DataPush;
  emitOp: ResolveOpEmit;
};

export function usePropEditor({
  registry,
  data,
  config,
  metadata,
  state,
  send,
  push,
  emitOp,
}: UsePropEditorProps): ReactNode {
  useDoubleClickEdit({ registry, data, config, send });

  const { pointer } = state.value as { pointer: string };
  const { lastSelectedId } = state.context;
  useKeyboardEdit({ registry, data, config, lastSelectedId, pointer, send });

  const editing = state.context.editing;
  const inline = editing?.mode === "inline" ? (editing as InlineEditing) : null;

  const commitPropEdit = useCallback(
    ({
      elementId,
      propKey,
      value,
      label,
    }: {
      elementId: string;
      propKey: string;
      value: unknown;
      label: string;
    }) =>
      editProp(data, elementId, [propKey], value, config).map((next) => {
        const result = push(next, label, `prop:${elementId}`);
        emitResolveOp({
          result,
          emitOp,
          op: { type: "update", id: elementId, trigger: "replace" },
          data: next,
        });
      }),
    [data, config, push, emitOp],
  );

  const commitInline = useCallback(
    (value: string) => {
      if (inline) {
        commitPropEdit({
          elementId: inline.elementId,
          propKey: inline.propKey,
          value,
          label: `Edited text: "${String(value).slice(0, 30)}"`,
        });
      }
      send({ type: "COMMIT_EDIT", newValue: value });
    },
    [inline, commitPropEdit, send],
  );

  const cancelInline = useCallback(() => send({ type: "CANCEL_EDIT" }), [send]);

  useInlineEdit({
    registry,
    editing: inline,
    onCommit: commitInline,
    onCancel: cancelInline,
  });

  const popoverComponent =
    editing?.mode === "popover" ? findById(data, editing.elementId) : null;

  const { fields: popoverFields } = useResolvedFields(
    popoverComponent,
    config,
    metadata,
  );

  const handlePropChange = useCallback(
    (propKey: string, value: unknown) => {
      if (!editing) return;
      commitPropEdit({
        elementId: editing.elementId,
        propKey,
        value,
        label: `Changed ${propKey}`,
      });
    },
    [editing, commitPropEdit],
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
