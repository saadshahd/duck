import {
  useHighlightRef,
  INSET,
  EXPAND,
  useShadowSheet,
} from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import css from "./selection.css?inline";

export function outsetRect(rect: DOMRect) {
  return {
    top: rect.top + INSET,
    left: rect.left + INSET,
    width: rect.width + EXPAND,
    height: rect.height + EXPAND,
  };
}

export function HoverHighlight({
  registry,
  elementId,
  elementType,
  showTooltip,
}: {
  registry: FiberRegistry;
  elementId: string;
  elementType: string | undefined;
  showTooltip?: boolean;
}) {
  useShadowSheet(css);
  const ref = useHighlightRef(registry, elementId);
  return (
    <div ref={ref} data-role="hover-highlight" className="hover-highlight">
      {elementType && <span className="element-label">{elementType}</span>}
      {showTooltip && (
        <span className="hover-tooltip" aria-hidden="true">
          Click to select · Drag to reorder
        </span>
      )}
    </div>
  );
}

export function SelectionRing({
  registry,
  elementId,
  editing,
}: {
  registry: FiberRegistry;
  elementId: string;
  /** When true, the ring renders in editing-mode style (bolder, accent colour)
   *  to distinguish "sheet open" from plain selection. */
  editing?: boolean;
}) {
  useShadowSheet(css);
  const ref = useHighlightRef(registry, elementId);
  return (
    <div
      ref={ref}
      data-role="selection-ring"
      className="selection-ring"
      data-editing={editing || undefined}
    />
  );
}
