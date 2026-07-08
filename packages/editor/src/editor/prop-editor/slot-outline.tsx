import { useState } from "react";
import type { ComponentData, Field } from "@puckeditor/core";
import { buildIndex, slotKeysOf, findById } from "@duckeditor/spec";
import { add } from "../spec-ops/add.js";
import { move } from "../spec-ops/move.js";
import { FieldLabel } from "./field-shell.js";
import { toDisplayLabel } from "./field-label.js";
import { useSlotCtx } from "./slot-context.js";
import { SlotInsertSheet } from "./slot-insert-sheet.js";
import { useShadowSheet } from "../overlay/index.js";
import css from "./slot-outline.css?inline";
import type { FieldProps } from "./puck-fields.js";

const randomSuffix = (): string => Math.random().toString(36).slice(2, 8);

const mintId = (componentType: string, taken: ReadonlySet<string>): string => {
  const prefix = componentType.toLowerCase();
  let id = `${prefix}-${randomSuffix()}`;
  while (taken.has(id)) id = `${prefix}-${randomSuffix()}`;
  return id;
};

export function SlotOutline({
  label,
  field,
}: FieldProps<Extract<Field, { type: "slot" }>, unknown>) {
  useShadowSheet(css);
  const { data, config, commit, parentId, crossDrag, setCrossDrag } =
    useSlotCtx();
  const [dragOverIndex, setDragOverIndex] = useState<number | undefined>(
    undefined,
  );
  const [insertOpen, setInsertOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Resolve direct children in this slot from the parent element
  const parentEntry = buildIndex(data).get(parentId);
  const children: ComponentData[] = parentEntry
    ? ((parentEntry.component.props[label] as ComponentData[] | undefined) ??
      [])
    : [];

  const handleDragStart = (e: React.DragEvent, i: number) => {
    setCrossDrag({
      srcId: children[i].props.id as string,
      srcSlotKey: label,
      srcIndex: i,
    });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, i: number) => {
    if (!crossDrag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    setDragOverIndex(e.clientY < mid ? i : i + 1);
  };

  const handleSentinelDragOver = (e: React.DragEvent) => {
    if (!crossDrag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(children.length);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!crossDrag || dragOverIndex === undefined) return;
    const destIndex = dragOverIndex;
    const { srcId, srcSlotKey, srcIndex } = crossDrag;

    // skip no-op: same slot, same effective position
    if (
      srcSlotKey === label &&
      (srcIndex === destIndex || srcIndex + 1 === destIndex)
    ) {
      setDragOverIndex(undefined);
      return;
    }

    const srcNode = findById(data, srcId);
    const srcLabel = srcNode
      ? (config.components[srcNode.type]?.label ?? srcNode.type)
      : srcId;

    move(data, srcId, { at: "slot", parentId, slotKey: label }, destIndex).map(
      (next) =>
        commit({
          beforeData: data,
          afterData: next,
          label: `Moved ${srcLabel}`,
          resolve: { kind: "update", id: parentId },
        }),
    );
    setDragOverIndex(undefined);
  };

  const handleDragEnd = () => {
    setCrossDrag(undefined);
    setDragOverIndex(undefined);
  };

  const handleInsert = (componentType: string) => {
    const taken = new Set(buildIndex(data).keys());
    const newId = mintId(componentType, taken);
    const component: ComponentData = {
      type: componentType,
      props: { id: newId },
    };
    add(
      data,
      { site: { at: "slot", parentId, slotKey: label }, component },
      config,
    ).map((next) =>
      commit({
        beforeData: data,
        afterData: next,
        label: `Added ${config.components[componentType]?.label ?? componentType}`,
        resolve: { kind: "update", id: parentId },
      }),
    );
    setInsertOpen(false);
  };

  const displayLabel = toDisplayLabel(label, field.label);

  return (
    <div className="slot-outline">
      <div className="slot-outline-header">
        <FieldLabel text={displayLabel} />
        <button
          type="button"
          className="slot-outline-add"
          aria-label={`Add component to ${displayLabel}`}
          onClick={() => setInsertOpen(true)}
        >
          +
        </button>
      </div>
      {children.length === 0 && (
        <div
          className="slot-outline-dropzone"
          data-active={crossDrag !== undefined || undefined}
          data-over={isDragOver || undefined}
          onDragOver={(e) => {
            if (!crossDrag) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            if (!crossDrag) return;
            e.preventDefault();
            setIsDragOver(false);
            const srcNode = findById(data, crossDrag.srcId);
            const srcLabel = srcNode
              ? (config.components[srcNode.type]?.label ?? srcNode.type)
              : crossDrag.srcId;
            move(
              data,
              crossDrag.srcId,
              { at: "slot", parentId, slotKey: label },
              0,
            ).map((next) =>
              commit({
                beforeData: data,
                afterData: next,
                label: `Moved ${srcLabel} here`,
                resolve: { kind: "update", id: parentId },
              }),
            );
          }}
        >
          <span>No children. Press + to add one.</span>
        </div>
      )}
      {children.length > 0 && (
        <ul className="slot-outline-list" onDrop={handleDrop}>
          {children.map((child, i) => {
            const childLabel =
              config.components[child.type]?.label ?? child.type;
            return (
              <li
                key={child.props.id as string}
                className="slot-outline-item"
                draggable
                data-dragging={
                  crossDrag?.srcSlotKey === label && crossDrag?.srcIndex === i
                    ? ""
                    : undefined
                }
                data-drop-above={dragOverIndex === i ? "" : undefined}
                data-drop-below={dragOverIndex === i + 1 ? "" : undefined}
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              >
                <span className="slot-outline-handle" aria-hidden>
                  ⠿
                </span>
                <span className="slot-outline-label">{childLabel}</span>
              </li>
            );
          })}
          <li
            className="slot-outline-sentinel"
            data-drop-above={dragOverIndex === children.length ? "" : undefined}
            onDragOver={handleSentinelDragOver}
            onDrop={handleDrop}
          />
        </ul>
      )}
      {insertOpen && (
        <SlotInsertSheet
          config={config}
          onSelect={handleInsert}
          onClose={() => setInsertOpen(false)}
        />
      )}
    </div>
  );
}
