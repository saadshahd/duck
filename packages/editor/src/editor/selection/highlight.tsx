import {
  useHighlightRef,
  INSET,
  EXPAND,
  useShadowSheet,
} from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import type { Target } from "../machine/index.js";
import css from "./selection.css?inline";

export function outsetRect(rect: DOMRect) {
  return {
    top: rect.top + INSET,
    left: rect.left + INSET,
    width: rect.width + EXPAND,
    height: rect.height + EXPAND,
  };
}

const isSlot = (t: Target) => t.kind === "slot";

export function HoverHighlight({
  registry,
  data,
  target,
  label,
}: {
  registry: FiberRegistry;
  data: Data;
  target: Target;
  label?: string;
}) {
  useShadowSheet(css);
  const ref = useTargetRect(registry, data, target);
  const className = isSlot(target) ? "slot-highlight" : "hover-highlight";
  return (
    <div ref={ref} data-role="hover-highlight" className={className}>
      {label && <span className="element-label">{label}</span>}
    </div>
  );
}

export function SelectionRing({
  registry,
  data,
  target,
}: {
  registry: FiberRegistry;
  data: Data;
  target: Target;
}) {
  useShadowSheet(css);
  const ref = useTargetRect(registry, data, target);
  const className = isSlot(target) ? "slot-ring" : "selection-ring";
  return <div ref={ref} data-role="selection-ring" className={className} />;
}
