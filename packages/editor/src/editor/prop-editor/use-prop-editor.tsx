import { useCallback, useEffect, type ReactNode } from "react";
import type { ComponentData, Config, Data, Metadata } from "@puckeditor/core";
import { findById } from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import type {
  EditorEvent,
  EditorSnapshot,
  InlineEditing,
} from "../machine/index.js";
import { editProp } from "../spec-ops/index.js";
import { hasResolver } from "../resolve-config.js";
import type { EditorCommit } from "../types.js";
import { useDoubleClickEdit } from "./use-double-click-edit.js";
import { useKeyboardEdit } from "./use-keyboard-edit.js";
import { useInlineEdit } from "./inline-input.js";
import { ArkEnvironment } from "../overlay/index.js";
import { PropSheet } from "./prop-sheet.js";
import { useSheetAnchor } from "./use-sheet-anchor.js";
import { useResolvedFields } from "./use-resolved-fields.js";
import { PuckFields } from "./puck-fields.js";
import type { ResolvedFields } from "./find-editable-prop.js";

/** True when opening the editor for this node should kick a force-resolve so the
 *  node's read-only / resolved props enter committed data before first render. */
export const shouldForceResolveOnOpen = (
  config: Config,
  component: ComponentData | null,
): boolean => !!component && hasResolver(config, component);

type UsePropEditorProps = {
  registry: FiberRegistry | null;
  data: Data;
  config: Config;
  metadata?: Metadata;
  state: EditorSnapshot;
  send: (event: EditorEvent) => void;
  commit: EditorCommit;
  forceResolve: (elementId: string) => void;
};

export function usePropEditor({
  registry,
  data,
  config,
  metadata,
  state,
  send,
  commit,
  forceResolve,
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
        commit({
          beforeData: data,
          afterData: next,
          label,
          group: `prop:${elementId}`,
          resolve: { kind: "update", id: elementId },
        });
      }),
    [data, config, commit],
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

  const sheetComponent =
    editing?.mode === "sheet" ? findById(data, editing.elementId) : null;

  useEffect(
    function forceResolveOnOpen() {
      if (editing?.mode !== "sheet" || !sheetComponent) return;
      if (!shouldForceResolveOnOpen(config, sheetComponent)) return;
      forceResolve(editing.elementId);
    },
    [editing?.mode, editing?.elementId, sheetComponent, config, forceResolve],
  );

  const { fields: sheetFields } = useResolvedFields(
    sheetComponent,
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

  if (!editing || editing.mode !== "sheet" || !sheetComponent || !registry) {
    return null;
  }

  return (
    <SheetView
      key={editing.elementId}
      registry={registry}
      component={sheetComponent}
      fields={sheetFields}
      onPropChange={handlePropChange}
    />
  );
}

function SheetView({
  registry,
  component,
  fields,
  onPropChange,
}: {
  registry: FiberRegistry;
  component: ComponentData;
  fields: ResolvedFields;
  onPropChange: (propKey: string, value: unknown) => void;
}): ReactNode {
  const elementId = (component.props as { id?: string }).id ?? "";
  const { cutoutRef, lineRef } = useSheetAnchor(registry, elementId);
  const readOnlyFields = component.readOnly as
    | Partial<Record<string, boolean>>
    | undefined;
  return (
    <>
      <PropSheet.Backdrop cutoutRef={cutoutRef} open />
      <PropSheet.Tether lineRef={lineRef} />
      <PropSheet.Panel open>
        <ArkEnvironment>
          <PuckFields
            fields={fields}
            values={component.props as Record<string, unknown>}
            readOnlyFields={readOnlyFields}
            onChange={onPropChange}
            elementId={elementId}
          />
        </ArkEnvironment>
      </PropSheet.Panel>
    </>
  );
}
