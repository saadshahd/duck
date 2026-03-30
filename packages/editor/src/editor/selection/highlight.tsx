import { useHighlightRef, INSET, EXPAND } from "./use-highlight-ref.js";
import { useShadowSheet } from "../overlay/index.js";
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
}: {
  registry: FiberRegistry;
  elementId: string;
  elementType: string | undefined;
}) {
  useShadowSheet(css);
  const ref = useHighlightRef(registry, elementId);
  return (
    <div ref={ref} data-role="hover-highlight" className="hover-highlight">
      {elementType && <span className="element-label">{elementType}</span>}
    </div>
  );
}

export function SelectionRing({
  registry,
  elementId,
}: {
  registry: FiberRegistry;
  elementId: string;
}) {
  useShadowSheet(css);
  const ref = useHighlightRef(registry, elementId);
  return (
    <div ref={ref} data-role="selection-ring" className="selection-ring" />
  );
}
