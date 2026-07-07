import type { ReactNode } from "react";
import { useShadowSheet } from "../overlay/index.js";
import { Disclosure } from "./disclosure.js";
import type { Gate } from "./array-items.js";
import css from "./array-control.css?inline";

function Row({
  summary,
  open,
  onToggle,
  canMoveUp,
  canMoveDown,
  onMove,
  remove,
  onRemove,
  readOnly,
}: {
  summary: ReactNode;
  open: boolean;
  onToggle: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: -1 | 1) => void;
  remove: Gate;
  onRemove: () => void;
  readOnly?: boolean;
}) {
  useShadowSheet(css);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!e.altKey) return;
    const delta = { ArrowUp: -1, ArrowDown: 1 }[e.key] as -1 | 1 | undefined;
    if (!delta || (delta === -1 && !canMoveUp) || (delta === 1 && !canMoveDown))
      return;
    e.preventDefault();
    e.stopPropagation();
    onMove(delta);
  };
  const upTitle = canMoveUp ? "Move item up (Alt+ArrowUp)" : "Already first";
  const downTitle = canMoveDown
    ? "Move item down (Alt+ArrowDown)"
    : "Already last";
  const removeTitle = remove.allowed ? "Remove item" : remove.reason;
  return (
    <div
      className="array-item-row"
      data-role="array-item-row"
      onKeyDown={readOnly ? undefined : handleKeyDown}
    >
      <Disclosure.Trigger label={summary} open={open} onToggle={onToggle} />
      <span className="array-item-actions">
        <button
          type="button"
          data-role="array-item-up"
          title={upTitle}
          aria-label={upTitle}
          disabled={readOnly || !canMoveUp}
          onClick={() => onMove(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          data-role="array-item-down"
          title={downTitle}
          aria-label={downTitle}
          disabled={readOnly || !canMoveDown}
          onClick={() => onMove(1)}
        >
          ↓
        </button>
        <button
          type="button"
          data-role="array-item-remove"
          title={removeTitle}
          aria-label={removeTitle}
          disabled={readOnly || !remove.allowed}
          onClick={onRemove}
        >
          ×
        </button>
      </span>
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
