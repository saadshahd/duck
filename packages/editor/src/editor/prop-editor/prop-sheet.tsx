import type { ReactNode, RefObject } from "react";
import { useShadowSheet } from "../overlay/index.js";
import css from "./prop-sheet.css?inline";
import propEditorCss from "./prop-editor.css?inline";
import { useScrollFade } from "./use-scroll-fade.js";

/** Single-div dim layer. The div is positioned over the selected element (via
 *  cutoutRef, driven by useSheetAnchor's rAF loop) so its own box is the
 *  transparent cutout. The box-shadow spills outward with spread 100vmax to
 *  paint the scrim over everything outside the cutout. pointer-events: none —
 *  purely visual. */
function Backdrop({
  cutoutRef,
  open,
}: {
  cutoutRef: RefObject<HTMLDivElement | null>;
  open: boolean;
}) {
  useShadowSheet(css);
  return (
    <div
      ref={cutoutRef}
      className="prop-sheet-backdrop"
      data-role="prop-sheet-backdrop"
      data-open={open || undefined}
    />
  );
}

/** SVG tether line connecting the selected element's right edge to the sheet
 *  panel's left edge. Endpoints are driven by useSheetAnchor via lineRef —
 *  never React state. Purely visual; pointer-events disabled via CSS. */
function Tether({ lineRef }: { lineRef: RefObject<SVGLineElement | null> }) {
  useShadowSheet(css);
  return (
    <svg className="prop-sheet-tether" data-role="prop-sheet-tether">
      {/* No strokeOpacity — opacity is baked into --tether-stroke (single source
          of truth per the conformed docs); stroke-width 1 matches the hover ring. */}
      <line ref={lineRef} stroke="var(--tether-stroke)" strokeWidth={1} />
    </svg>
  );
}

/** Slide-in panel anchored to the viewport's right edge (position: fixed; right: 0).
 *  Never overlaps the canvas element — the canvas reserves width via padding-right
 *  (see occlusion reserve in editor.tsx, Task 7). Children are the field renderers.
 *  `label` is the component type label derived from Puck config — catalog-agnostic.
 *  `onClose` fires when the × button is pressed. */
function Panel({
  open,
  label,
  onClose,
  children,
}: {
  open: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useShadowSheet(css);
  useShadowSheet(propEditorCss);
  const { viewportRef, sentinelRef, fadeRef } = useScrollFade();
  return (
    <div
      className="prop-sheet"
      data-role="prop-sheet"
      data-open={open || undefined}
    >
      <header className="prop-sheet-header" data-role="prop-sheet-header">
        <span className="prop-sheet-header-label">{label}</span>
        <button
          className="prop-sheet-close"
          aria-label="Close"
          data-role="prop-sheet-close"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="prop-sheet-viewport" ref={viewportRef}>
        {children}
        <div className="prop-sheet-sentinel" ref={sentinelRef} aria-hidden />
      </div>
      <div className="prop-sheet-fade" ref={fadeRef} aria-hidden />
    </div>
  );
}

/** Compound component group for the focus sheet surface.
 *  Backdrop: dim layer with cutout. Tether: SVG line to selected element.
 *  Panel: slide-in sheet anchored to viewport right edge. */
export const PropSheet = { Backdrop, Tether, Panel } as const;
