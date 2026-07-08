import {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type CSSProperties,
  type Ref,
  type MouseEventHandler,
} from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
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

/** Chrome-click hygiene for every overlay button. Canvas selection lives on a
 *  document-level click listener that hit-tests the pointer; an action that
 *  unmounts its own button mid-dispatch (edit opens the sheet, delete removes
 *  the element, moving to the last slot unmounts the very arrow just clicked)
 *  detaches it, so the bubbled click would fail the "from shadow DOM?" guard and
 *  re-select whatever canvas element sits beneath the button. Stopping here —
 *  synchronously, before the unmount — keeps every chrome click off that
 *  listener. Both ActionButton and EdgeArrow route through this one guard so no
 *  chrome control can diverge from it. */
const chromeClick =
  (onClick: () => void): MouseEventHandler<HTMLButtonElement> =>
  (e) => {
    e.stopPropagation();
    onClick();
  };

/** Base for every action-bar button. */
function ActionButton({
  role,
  label,
  onClick,
  children,
  tooltip = label,
  pressed,
  style,
}: {
  role: string;
  label: string;
  onClick: () => void;
  children: ReactNode;
  tooltip?: string;
  pressed?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      data-role={role}
      aria-label={label}
      aria-pressed={pressed}
      style={style}
      onClick={chromeClick(onClick)}
    >
      {children}
      <span className="action-bar-tooltip" role="tooltip">
        {tooltip}
      </span>
    </button>
  );
}

/** Edit-props button — renders inside the unified action bar. */
export function ActionEdit({ onClick }: { onClick: () => void }) {
  return (
    <ActionButton role="action-edit" label="Edit props" onClick={onClick}>
      <PencilIcon />
    </ActionButton>
  );
}

/** Insert sibling button — renders inside the unified action bar. */
export function ActionInsert({ onClick }: { onClick: () => void }) {
  return (
    <ActionButton role="action-insert" label="Insert" onClick={onClick}>
      +
    </ActionButton>
  );
}

/** Delete button — renders inside the unified action bar. */
export function ActionDelete({ onClick }: { onClick: () => void }) {
  return (
    <ActionButton role="action-delete" label="Delete" onClick={onClick}>
      ×
    </ActionButton>
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
    <ActionButton
      role="box-model-toggle"
      label="Toggle box model"
      tooltip="Box model"
      pressed={active}
      onClick={onToggle}
      style={active ? { background: "rgba(255,255,255,0.12)" } : undefined}
    >
      <BoxModelIcon />
    </ActionButton>
  );
}

/** A move arrow anchored to an element edge — distinct from the action-bar
 *  buttons: it carries a positioning ref (useEdgeArrow) and no tooltip, so it
 *  is its own component rather than an ActionButton variant. */
function EdgeArrow({
  arrowRef,
  role,
  axis,
  label,
  glyph,
  onClick,
}: {
  arrowRef: Ref<HTMLButtonElement>;
  role: string;
  axis: Axis;
  label: string;
  glyph: string;
  onClick: () => void;
}) {
  return (
    <button
      ref={arrowRef}
      type="button"
      className="edge-arrow"
      data-role={role}
      data-axis={axis}
      aria-label={label}
      onClick={chromeClick(onClick)}
    >
      {glyph}
    </button>
  );
}

type Edge = "top" | "bottom" | "left" | "right";

/** Fixed-position style for an arrow anchored to each element edge.
 *  - top:    centered horizontally, just inside the element top edge
 *  - bottom: centered horizontally, just below the element
 *  - left:   centered vertically, just left of the element
 *  - right:  centered vertically, just right of the element */
const EDGE_STYLE: Record<
  Edge,
  (
    rect: DOMRect,
    arrowSize: number,
    gap: number,
  ) => { top: number; left: number }
> = {
  top: (rect, arrowSize, gap) => ({
    top: rect.top + gap,
    left: rect.left + rect.width / 2 - arrowSize / 2,
  }),
  bottom: (rect, arrowSize, gap) => ({
    top: rect.bottom + gap,
    left: rect.left + rect.width / 2 - arrowSize / 2,
  }),
  left: (rect, arrowSize, gap) => ({
    top: rect.top + rect.height / 2 - arrowSize / 2,
    left: rect.left - gap - arrowSize,
  }),
  right: (rect, arrowSize, gap) => ({
    top: rect.top + rect.height / 2 - arrowSize / 2,
    left: rect.right + gap,
  }),
};

const ARROW_SIZE = 24;
const EDGE_GAP = 6;

const clampAxis = (value: number, max: number) =>
  Math.min(Math.max(value, 0), max);

type ArrowPlacement =
  { detached: true } | { detached: false; top: number; left: number };

/** H2 — the handle never leaves the viewport. Clamps the arrow box inside the
 *  viewport; when the anchor edge itself is scrolled out (the clamp would
 *  detach the arrow from its edge by more than its own size) the arrow hides
 *  instead of floating over unrelated content (H1). */
function viewportArrowStyle(
  desired: { top: number; left: number },
  arrowSize: number,
  viewport: { width: number; height: number },
): ArrowPlacement {
  const top = clampAxis(desired.top, viewport.height - arrowSize);
  const left = clampAxis(desired.left, viewport.width - arrowSize);
  const isDetached =
    Math.abs(top - desired.top) > arrowSize ||
    Math.abs(left - desired.left) > arrowSize;
  return isDetached ? { detached: true } : { detached: false, top, left };
}

/** Syncs a fixed-position button to an element edge via autoUpdate.
 *  Returns a callback ref so positioning starts the moment the button mounts,
 *  regardless of when canMove* flips — avoiding the 0,0 flash from a stale
 *  useEffect that won't re-run when only ref.current changes. */
function useEdgeArrow(registry: FiberRegistry, elementId: string, edge: Edge) {
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
        const placement = viewportArrowStyle(
          EDGE_STYLE[edge](r, ARROW_SIZE, EDGE_GAP),
          ARROW_SIZE,
          { width: window.innerWidth, height: window.innerHeight },
        );
        if (placement.detached) {
          btn.style.visibility = "hidden";
          return;
        }
        btn.style.visibility = "";
        btn.style.top = `${placement.top}px`;
        btn.style.left = `${placement.left}px`;
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

/** H1 — the handle never occludes the selected element. Flip-first: when the
 *  element is flush to the viewport top the bar FLIPS below it, never slides
 *  over it. Shift stays on its default main axis (horizontal for top/bottom
 *  placements) with crossAxis off — vertical shifting is what could overlap
 *  the element, and flip already owns that axis. */
const MIDDLEWARE = [
  offset(8),
  flip({ fallbackPlacements: ["bottom"] }),
  shift({ padding: 8 }),
];

const ARIA_LABELS: Record<Axis, { prev: string; next: string }> = {
  horizontal: { prev: "Move left", next: "Move right" },
  vertical: { prev: "Move up", next: "Move down" },
};

const ARROW_GLYPHS: Record<Axis, { prev: string; next: string }> = {
  horizontal: { prev: "←", next: "→" },
  vertical: { prev: "↑", next: "↓" },
};

// Which element edge each move arrow floats on, by axis.
const ARROW_EDGES: Record<Axis, { prev: Edge; next: Edge }> = {
  vertical: { prev: "top", next: "bottom" },
  horizontal: { prev: "left", next: "right" },
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
  const edges = ARROW_EDGES[axis];

  const nextRef = useEdgeArrow(registry, elementId, edges.next);
  const prevEdgeRef = useEdgeArrow(registry, elementId, edges.prev);

  return (
    <>
      {/* Floating action bar — anchored above the element, shifts inside when near viewport top */}
      <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 1 }}>
        <div className="action-bar" role="toolbar" aria-label="Element actions">
          {onSelectParent && (
            <ActionButton
              role="select-parent-btn"
              label="Select parent element"
              onClick={onSelectParent}
            >
              ↑
            </ActionButton>
          )}
          {elementType && (
            <span className="action-bar-type-label">{elementType}</span>
          )}
          {children}
        </div>
      </div>

      {/* Edge arrow: bottom (↓) for vertical, right (→) for horizontal */}
      {canMoveNext && (
        <EdgeArrow
          arrowRef={nextRef}
          role="edge-arrow-next"
          axis={axis}
          label={labels.next}
          glyph={glyphs.next}
          onClick={onMoveNext}
        />
      )}

      {/* Edge arrow: top (↑) for vertical, left (←) for horizontal */}
      {canMovePrev && (
        <EdgeArrow
          arrowRef={prevEdgeRef}
          role="edge-arrow-prev"
          axis={axis}
          label={labels.prev}
          glyph={glyphs.prev}
          onClick={onMovePrev}
        />
      )}
    </>
  );
}
