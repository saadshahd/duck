import type { ReactNode } from "react";
import { useShadowSheet } from "../overlay/index.js";
import type { Gate } from "./array-items.js";
import css from "./array-control.css?inline";

type Move = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: -1 | 1) => void;
  remove: Gate;
  onRemove: () => void;
  readOnly?: boolean;
};

const onAltArrow =
  ({ canMoveUp, canMoveDown, onMove, readOnly }: Move) =>
  (e: React.KeyboardEvent) => {
    if (readOnly || !e.altKey) return;
    const delta = { ArrowUp: -1, ArrowDown: 1 }[e.key] as -1 | 1 | undefined;
    if (!delta || (delta === -1 && !canMoveUp) || (delta === 1 && !canMoveDown))
      return;
    e.preventDefault();
    e.stopPropagation();
    onMove(delta);
  };

/** Reorder + remove buttons. Revealed on row hover / button focus (see CSS);
 *  each click is stopped from bubbling so it never reaches the document
 *  selection handler as a canvas click. */
function Actions({
  canMoveUp,
  canMoveDown,
  onMove,
  remove,
  onRemove,
  readOnly,
}: Move) {
  const upTitle = canMoveUp
    ? "Move up (Alt+ArrowUp)"
    : "First item — can't move up";
  const downTitle = canMoveDown
    ? "Move down (Alt+ArrowDown)"
    : "Last item — can't move down";
  const removeTitle = remove.allowed ? "Remove item" : remove.reason;
  return (
    <span className="array-row-actions" data-role="array-item-actions">
      <button
        type="button"
        data-role="array-item-up"
        title={upTitle}
        aria-label={upTitle}
        disabled={readOnly || !canMoveUp}
        onClick={(e) => {
          e.stopPropagation();
          onMove(-1);
        }}
      >
        ↑
      </button>
      <button
        type="button"
        data-role="array-item-down"
        title={downTitle}
        aria-label={downTitle}
        disabled={readOnly || !canMoveDown}
        onClick={(e) => {
          e.stopPropagation();
          onMove(1);
        }}
      >
        ↓
      </button>
      <button
        type="button"
        data-role="array-item-remove"
        title={removeTitle}
        aria-label={removeTitle}
        disabled={readOnly || !remove.allowed}
        onClick={(e) => {
          // Removing unmounts this row; without stopPropagation the bubbled click
          // reaches the document selection handler with a detached target and
          // dismisses the whole sheet.
          e.stopPropagation();
          onRemove();
        }}
      >
        ×
      </button>
    </span>
  );
}

type RowProps = Move & {
  rowRef?: (el: HTMLElement | null) => void;
  children?: ReactNode;
} & (
    | { mode: "inline" }
    | {
        mode: "disclosure";
        summary: ReactNode;
        secondary?: ReactNode;
        open: boolean;
        onToggle: () => void;
      }
  );

/** One array item. `inline` — a single-field item whose row IS the field
 *  control (passed as children). `disclosure` — a multi-field item: a caret +
 *  summary + trailing secondary/actions slot, with the item's fields (children)
 *  revealed below when open. */
function Row(props: RowProps) {
  useShadowSheet(css);
  const modifier =
    props.mode === "inline" ? "array-row--inline" : "array-row--disclosure";
  return (
    <div
      ref={props.rowRef}
      className={`array-row ${modifier}`}
      data-role="array-item-row"
      data-open={props.mode === "disclosure" && props.open ? "" : undefined}
      tabIndex={-1}
      onKeyDown={onAltArrow(props)}
    >
      {props.mode === "inline" ? (
        <>
          <div className="array-row-field">{props.children}</div>
          <Actions {...props} />
        </>
      ) : (
        <>
          <div className="array-row-summary">
            <button
              type="button"
              className="array-row-toggle"
              data-role="array-item-toggle"
              aria-expanded={props.open}
              onClick={props.onToggle}
            >
              <span className="array-row-chevron" aria-hidden>
                {props.open ? "▾" : "▸"}
              </span>
              <span className="array-row-title">{props.summary}</span>
            </button>
            <span className="array-row-tail">
              {props.secondary !== undefined && (
                <span className="array-row-secondary">{props.secondary}</span>
              )}
              <Actions {...props} />
            </span>
          </div>
          {props.open && (
            <div className="array-row-fields">{props.children}</div>
          )}
        </>
      )}
    </div>
  );
}

function Add({
  gate,
  label,
  onAdd,
  readOnly,
}: {
  gate: Gate;
  label: string;
  onAdd: () => void;
  readOnly?: boolean;
}) {
  useShadowSheet(css);
  const title = gate.allowed ? `Add item to ${label}` : gate.reason;
  return (
    <button
      type="button"
      className="array-add"
      data-role="array-add"
      title={title}
      aria-label={title}
      disabled={readOnly || !gate.allowed}
      onClick={onAdd}
    >
      + Add item
    </button>
  );
}

export const ArrayControl = { Row, Add } as const;
