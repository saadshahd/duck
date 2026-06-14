import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { useFloating, offset, shift, autoUpdate } from "@floating-ui/react";
import { useShadowSheet, useRegistryAnchor } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import type { Axis } from "../layout/index.js";
import { ZERO_RECT } from "../layout/index.js";
import css from "./selection.css?inline";

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

const BoxModelIcon = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <rect x="0.6" y="0.6" width="8.8" height="8.8" rx="0.8" />
    <rect x="3" y="3" width="4" height="4" />
  </svg>
);

/** Edit-props button — renders inside the unified action bar. */
export function ActionEdit({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-role="action-edit"
      aria-label="Edit props"
      onClick={onClick}
    >
      <PencilIcon />
      <span className="action-bar-tooltip" role="tooltip">
        Edit props
      </span>
    </button>
  );
}

/** Insert sibling button — renders inside the unified action bar. */
export function ActionInsert({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-role="action-insert"
      aria-label="Insert"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      +
      <span className="action-bar-tooltip" role="tooltip">
        Insert
      </span>
    </button>
  );
}

/** Delete button — renders inside the unified action bar. */
export function ActionDelete({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-role="action-delete"
      aria-label="Delete"
      onClick={onClick}
    >
      ×
      <span className="action-bar-tooltip" role="tooltip">
        Delete
      </span>
    </button>
  );
}

/** Box-model toggle button — renders inside the unified action bar. */
export function ActionBoxModel({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-role="box-model-toggle"
      aria-label="Toggle box model"
      aria-pressed={active}
      onClick={onToggle}
      style={active ? { background: "rgba(255,255,255,0.12)" } : undefined}
    >
      <BoxModelIcon />
      <span className="action-bar-tooltip" role="tooltip">
        Box model
      </span>
    </button>
  );
}

/** Computes fixed-position styles for an arrow anchored to an element edge.
 *  - top:    centered horizontally, just inside the element top edge
 *  - bottom: centered horizontally, just below the element
 *  - left:   centered vertically, just left of the element
 *  - right:  centered vertically, just right of the element */
function edgeStyle(
  rect: DOMRect,
  edge: "top" | "bottom" | "left" | "right",
  arrowSize: number,
  gap: number,
): React.CSSProperties {
  const half = arrowSize / 2;
  if (edge === "top") {
    return {
      top: rect.top + gap,
      left: rect.left + rect.width / 2 - half,
    };
  }
  if (edge === "bottom") {
    return {
      top: rect.bottom + gap,
      left: rect.left + rect.width / 2 - half,
    };
  }
  if (edge === "left") {
    return {
      top: rect.top + rect.height / 2 - half,
      left: rect.left - gap - arrowSize,
    };
  }
  // right
  return {
    top: rect.top + rect.height / 2 - half,
    left: rect.right + gap,
  };
}

const ARROW_SIZE = 24;
const EDGE_GAP = 6;

/** Syncs a fixed-position button to an element edge via autoUpdate.
 *  Returns a callback ref so positioning starts the moment the button mounts,
 *  regardless of when canMove* flips — avoiding the 0,0 flash from a stale
 *  useEffect that won't re-run when only ref.current changes. */
function useEdgeArrow(
  registry: FiberRegistry,
  elementId: string,
  edge: "top" | "bottom" | "left" | "right",
) {
  const cleanupRef = useRef<(() => void) | null>(null);

  const ref = useCallback(
    (btn: HTMLButtonElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current = null;

      if (!btn) return;

      const sync = () => {
        const el = registry.get(elementId);
        if (!el) {
          btn.style.top = "";
          btn.style.left = "";
          return;
        }
        const r = el.getBoundingClientRect();
        const s = edgeStyle(r, edge, ARROW_SIZE, EDGE_GAP);
        btn.style.top = `${s.top}px`;
        btn.style.left = `${s.left}px`;
      };

      const el = registry.get(elementId);
      if (!el) {
        btn.style.top = "";
        btn.style.left = "";
        return;
      }

      const vRef = {
        getBoundingClientRect: () =>
          registry.get(elementId)?.getBoundingClientRect() ?? ZERO_RECT,
      };

      sync();
      cleanupRef.current = autoUpdate(vRef, btn, sync, {
        animationFrame: true,
      });
    },
    [registry, elementId, edge],
  );

  useEffect(
    () => () => {
      cleanupRef.current?.();
    },
    [],
  );

  return ref;
}

const MIDDLEWARE = [offset(8), shift({ padding: 8 })];

const ARIA_LABELS: Record<Axis, { prev: string; next: string }> = {
  horizontal: { prev: "Move left", next: "Move right" },
  vertical: { prev: "Move up", next: "Move down" },
};

const ARROW_GLYPHS: Record<Axis, { prev: string; next: string }> = {
  horizontal: { prev: "←", next: "→" },
  vertical: { prev: "↑", next: "↓" },
};

// Which edge does the "next" arrow sit on, by axis?
const NEXT_EDGE: Record<Axis, "bottom" | "right"> = {
  vertical: "bottom",
  horizontal: "right",
};

/** Unified floating action bar: move arrows + optional action buttons.
 *
 * Vertical axis (element inside a vertical stack):
 *   - ↑ (move up)   → stays in the action bar
 *   - ↓ (move down) → floats at the BOTTOM edge of the selected element
 *
 * Horizontal axis (element inside a row):
 *   - ← (move left)  → floats at the LEFT edge of the selected element
 *   - → (move right) → floats at the RIGHT edge of the selected element
 *
 * Edge arrows only render when the corresponding move is available.
 * All arrows render inside the shadow DOM; none occlude the element. */
export function EdgeArrows({
  elementId,
  registry,
  axis,
  canMovePrev,
  canMoveNext,
  onMovePrev,
  onMoveNext,
  onSelectParent,
  elementType,
  children,
}: {
  elementId: string;
  registry: FiberRegistry;
  axis: Axis;
  canMovePrev: boolean;
  canMoveNext: boolean;
  onMovePrev: () => void;
  onMoveNext: () => void;
  onSelectParent?: () => void;
  elementType?: string;
  children?: ReactNode;
}) {
  useShadowSheet(css);

  const { refs, floatingStyles } = useFloating({
    placement: "top",
    middleware: MIDDLEWARE,
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useRegistryAnchor(refs, registry, elementId);

  const labels = ARIA_LABELS[axis];
  const glyphs = ARROW_GLYPHS[axis];

  // Edge arrows — horizontal: left+right; vertical: top+bottom
  const nextEdge = NEXT_EDGE[axis];
  const prevEdge: "left" | "top" = axis === "horizontal" ? "left" : "top";

  const nextRef = useEdgeArrow(registry, elementId, nextEdge);
  const prevEdgeRef = useEdgeArrow(registry, elementId, prevEdge);

  return (
    <>
      {/* Floating action bar — anchored above the element, shifts inside when near viewport top */}
      <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 1 }}>
        <div className="action-bar" role="toolbar" aria-label="Element actions">
          {onSelectParent && (
            <button
              type="button"
              data-role="select-parent-btn"
              aria-label="Select parent element"
              onClick={(e) => {
                e.stopPropagation();
                onSelectParent();
              }}
            >
              ↑
            </button>
          )}
          {elementType && (
            <span className="action-bar-type-label">{elementType}</span>
          )}
          {children}
        </div>
      </div>

      {/* Edge arrow: bottom (↓) for vertical, right (→) for horizontal */}
      {canMoveNext && (
        <button
          ref={nextRef}
          type="button"
          className="edge-arrow"
          data-role="edge-arrow-next"
          data-axis={axis}
          aria-label={labels.next}
          onClick={onMoveNext}
        >
          {glyphs.next}
        </button>
      )}

      {/* Edge arrow: top (↑) for vertical, left (←) for horizontal */}
      {canMovePrev && (
        <button
          ref={prevEdgeRef}
          type="button"
          className="edge-arrow"
          data-role="edge-arrow-prev"
          data-axis={axis}
          aria-label={labels.prev}
          onClick={onMovePrev}
        >
          {glyphs.prev}
        </button>
      )}
    </>
  );
}
