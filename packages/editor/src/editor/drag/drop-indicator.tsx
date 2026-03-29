import type { FiberRegistry } from "../fiber/index.js";
import type { DropTarget } from "./use-drag-reorder.js";

type Props = { registry: FiberRegistry; target: DropTarget };

export function DropIndicator({ registry, target }: Props) {
  const el = registry.get(target.elementId);
  if (!el) return null;

  const r = el.getBoundingClientRect();
  const isVerticalAxis = target.axis === "vertical";

  // Vertical axis: horizontal line at top/bottom edge
  // Horizontal axis: vertical line at left/right edge
  const style = isVerticalAxis
    ? {
        top: target.edge === "top" ? r.top : r.bottom,
        left: r.left,
        width: r.width,
        height: 2,
      }
    : {
        top: r.top,
        left: target.edge === "left" ? r.left : r.right,
        width: 2,
        height: r.height,
      };

  return (
    <div data-role="drop-indicator" className="drop-indicator" style={style} />
  );
}
