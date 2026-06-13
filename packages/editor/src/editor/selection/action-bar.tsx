import { useEffect, type ReactNode, type RefObject } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  useMergeRefs,
} from "@floating-ui/react";
import { useShadowSheet } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import type { Axis } from "../layout/index.js";
import css from "./selection.css?inline";

export type EditorAction =
  | { tag: "insert" }
  | { tag: "move-up" }
  | { tag: "move-down" }
  | { tag: "delete" }
  | { tag: "edit" };

const MOVE_LABELS: Record<Axis, { prev: string; next: string }> = {
  vertical: { prev: "↑", next: "↓" },
  horizontal: { prev: "←", next: "→" },
};

const MIDDLEWARE = [offset(8), flip(), shift({ padding: 8 })];

const ZERO_RECT: DOMRect = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  toJSON: () => ({}),
};

const PencilIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 13 13"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M9.5 1.5 11.5 3.5 4 11 1.5 11.5 2 9 9.5 1.5Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export function FloatingActionBar({
  registry,
  elementId,
  axis,
  canMovePrev,
  canMoveNext,
  canInsert,
  onAction,
  toolbarRef,
  children,
}: {
  registry: FiberRegistry;
  elementId: string;
  axis: Axis;
  canMovePrev: boolean;
  canMoveNext: boolean;
  canInsert: boolean;
  onAction: (action: EditorAction) => void;
  toolbarRef: RefObject<HTMLElement | null>;
  children?: ReactNode;
}) {
  useShadowSheet(css);
  const { refs, floatingStyles } = useFloating({
    placement: "top",
    middleware: MIDDLEWARE,
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useEffect(() => {
    refs.setPositionReference({
      getBoundingClientRect: () => {
        const el = registry.get(elementId);
        return el?.getBoundingClientRect() ?? ZERO_RECT;
      },
    });
  }, [refs, registry, elementId]);

  const labels = MOVE_LABELS[axis];
  const moveUpLabel = axis === "vertical" ? "Move up" : "Move left";
  const moveDownLabel = axis === "vertical" ? "Move down" : "Move right";
  const mergedRef = useMergeRefs([refs.setFloating, toolbarRef]);

  return (
    <div ref={mergedRef} style={{ ...floatingStyles, zIndex: 1 }}>
      <div className="action-bar" role="toolbar">
        <button
          type="button"
          aria-label={moveUpLabel}
          data-role="action-move-up"
          disabled={!canMovePrev}
          onClick={() => onAction({ tag: "move-up" })}
        >
          {labels.prev}
          <span className="action-bar-tooltip" role="tooltip">
            {moveUpLabel}
          </span>
        </button>
        <button
          type="button"
          aria-label={moveDownLabel}
          data-role="action-move-down"
          disabled={!canMoveNext}
          onClick={() => onAction({ tag: "move-down" })}
        >
          {labels.next}
          <span className="action-bar-tooltip" role="tooltip">
            {moveDownLabel}
          </span>
        </button>
        <button
          type="button"
          aria-label="Delete"
          data-role="action-delete"
          onClick={() => onAction({ tag: "delete" })}
        >
          ×
          <span className="action-bar-tooltip" role="tooltip">
            Delete
          </span>
        </button>
        <button
          type="button"
          aria-label="Edit props"
          data-role="action-edit"
          onClick={() => onAction({ tag: "edit" })}
        >
          <PencilIcon />
          <span className="action-bar-tooltip" role="tooltip">
            Edit props
          </span>
        </button>
        {canInsert && (
          <button
            type="button"
            aria-label="Insert"
            data-role="action-insert"
            onClick={(e) => {
              e.stopPropagation();
              onAction({ tag: "insert" });
            }}
          >
            +
            <span className="action-bar-tooltip" role="tooltip">
              Insert
            </span>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
