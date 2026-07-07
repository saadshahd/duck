import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import { useScrollIntoCenter } from "./use-scroll-into-center.js";
import { useScrollLock } from "./use-scroll-lock.js";
import { useResolvedFields } from "./use-resolved-fields.js";
import { PuckFields, type ChangeMeta } from "./puck-fields.js";
import type { ResolvedFields } from "./find-editable-prop.js";

/** Exit animation duration in ms — must match prop-sheet.css `[data-closing]` transition-duration. */
const EXIT_MS = 150;

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
      group,
    }: {
      elementId: string;
      propKey: string;
      value: unknown;
      label: string;
      group?: string;
    }) =>
      editProp(data, elementId, [propKey], value, config).map((next) => {
        commit({
          beforeData: data,
          afterData: next,
          label,
          ...(group && { group }),
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
          group: `prop:${inline.elementId}`,
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

  const sheetEditing = editing?.mode === "sheet" ? editing : null;
  const sheetComponent = sheetEditing
    ? findById(data, sheetEditing.elementId)
    : null;

  useEffect(
    function forceResolveOnOpen() {
      if (!sheetEditing || !sheetComponent) return;
      if (!shouldForceResolveOnOpen(config, sheetComponent)) return;
      forceResolve(sheetEditing.elementId);
    },
    [sheetEditing, sheetComponent, config, forceResolve],
  );

  const { fields: sheetFields } = useResolvedFields(
    sheetComponent,
    config,
    metadata,
  );

  const handlePropChange = useCallback(
    (propKey: string, value: unknown, meta?: ChangeMeta) => {
      if (!editing) return;
      commitPropEdit({
        elementId: editing.elementId,
        propKey,
        value,
        label: meta?.label ?? `Changed ${propKey}`,
        ...(meta?.coalesce === false
          ? {}
          : { group: `prop:${editing.elementId}` }),
      });
    },
    [editing, commitPropEdit],
  );

  const cancelSheet = useCallback(() => send({ type: "CANCEL_EDIT" }), [send]);

  // Keep the last valid sheet snapshot alive during exit animation. When the
  // sheet editing ends the snapshot freezes at its last value; a "closing" flag
  // drives the CSS exit transition, and after EXIT_MS the component unmounts.
  const snapshotRef = useRef<{
    registry: FiberRegistry;
    config: Config;
    component: ComponentData;
    fields: ResolvedFields;
    elementId: string;
  } | null>(null);
  const [closing, setClosing] = useState(false);

  const isSheetOpen = !!(sheetEditing && sheetComponent && registry);

  useScrollIntoCenter({
    registry,
    elementId: sheetEditing?.elementId,
    active: isSheetOpen,
  });
  useScrollLock({ active: isSheetOpen });

  if (isSheetOpen) {
    snapshotRef.current = {
      registry,
      config,
      component: sheetComponent,
      fields: sheetFields,
      elementId: sheetEditing.elementId,
    };
  }

  useEffect(
    function manageClosingState() {
      if (isSheetOpen) {
        setClosing(false);
        return;
      }
      if (!snapshotRef.current) return;
      setClosing(true);
      const id = setTimeout(() => {
        snapshotRef.current = null;
        setClosing(false);
      }, EXIT_MS);
      return () => clearTimeout(id);
    },
    [isSheetOpen],
  );

  const snap = snapshotRef.current;
  if (!snap) return null;

  return (
    <SheetView
      registry={snap.registry}
      config={snap.config}
      component={snap.component}
      fields={snap.fields}
      open={isSheetOpen}
      closing={closing}
      onPropChange={handlePropChange}
      onClose={cancelSheet}
      data={data}
      commit={commit}
    />
  );
}

function SheetView({
  registry,
  config,
  component,
  fields,
  open,
  closing,
  onPropChange,
  onClose,
  data,
  commit,
}: {
  registry: FiberRegistry;
  config: Config;
  component: ComponentData;
  fields: ResolvedFields;
  open: boolean;
  closing: boolean;
  onPropChange: (propKey: string, value: unknown, meta?: ChangeMeta) => void;
  onClose: () => void;
  data: Data;
  commit: EditorCommit;
}): ReactNode {
  const elementId = (component.props as { id?: string }).id ?? "";
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  }, [elementId]);

  const { cutoutRef, lineRef } = useSheetAnchor(registry, elementId);
  const readOnlyFields = component.readOnly as
    Partial<Record<string, boolean>> | undefined;
  const typeLabel =
    (config.components[component.type] as { label?: string } | undefined)
      ?.label ?? component.type;
  return (
    <>
      <PropSheet.Backdrop cutoutRef={cutoutRef} open={open} />
      <PropSheet.Tether lineRef={lineRef} />
      <PropSheet.Panel
        open={open}
        closing={closing}
        label={typeLabel}
        onClose={onClose}
        onViewport={(el) => {
          viewportRef.current = el;
        }}
      >
        <ArkEnvironment>
          <PuckFields
            fields={fields}
            values={component.props as Record<string, unknown>}
            readOnlyFields={readOnlyFields}
            onChange={onPropChange}
            elementId={elementId}
            data={data}
            config={config}
            commit={commit}
          />
        </ArkEnvironment>
      </PropSheet.Panel>
    </>
  );
}
