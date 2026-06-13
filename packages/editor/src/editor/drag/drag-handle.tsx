import { useShadowSheet } from "../overlay/index.js";
import css from "./drag.css?inline";

/** Visible drag handle affordance rendered in the selection label cluster.
 *  Provides an accessible label and a ≥44×44px touch target via a
 *  pseudo-element so the visible glyph size is unchanged. The button signals
 *  draggability to assistive technology while the underlying pragmatic-dnd
 *  attachment (on the whole element) handles the actual drag mechanics. */
export function DragHandle({
  onPointerDown,
}: {
  onPointerDown?: React.PointerEventHandler;
}) {
  useShadowSheet(css);
  return (
    <button
      type="button"
      className="drag-handle"
      data-role="drag-handle"
      aria-label="Drag to reorder"
      onPointerDown={onPointerDown}
    >
      {/* Six-dot grip icon */}
      <svg
        width="10"
        height="14"
        viewBox="0 0 10 14"
        fill="currentColor"
        aria-hidden="true"
      >
        <circle cx="3" cy="2" r="1.2" />
        <circle cx="7" cy="2" r="1.2" />
        <circle cx="3" cy="7" r="1.2" />
        <circle cx="7" cy="7" r="1.2" />
        <circle cx="3" cy="12" r="1.2" />
        <circle cx="7" cy="12" r="1.2" />
      </svg>
    </button>
  );
}
