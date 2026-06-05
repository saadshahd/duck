import { useShadowSheet } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import type { DropTarget } from "../layout/index.js";
import css from "./drag.css?inline";

type Props = { registry: FiberRegistry; target: DropTarget };

const INSET = -2;
const EXPAND = 4;

function ContainerHighlight({
  registry,
  target,
}: {
  registry: FiberRegistry;
  target: DropTarget & { kind: "container" };
}) {
  const r =
    target.region ?? registry.get(target.elementId)?.getBoundingClientRect();
  if (!r) return null;
  return (
    <div
      data-role="drop-indicator-container"
      className="drop-indicator-container"
      style={{
        top: r.top + INSET,
        left: r.left + INSET,
        width: r.width + EXPAND,
        height: r.height + EXPAND,
      }}
    />
  );
}

function LineIndicator({
  registry,
  target,
}: {
  registry: FiberRegistry;
  target: DropTarget & { kind: "line" };
}) {
  const el = registry.get(target.elementId);
  if (!el) return null;

  const r = el.getBoundingClientRect();
  const isV = target.axis === "vertical";

  const style = isV
    ? {
        top: target.edge === "top" ? r.top : r.bottom,
        left: r.left,
        width: r.width,
        height: 0,
      }
    : {
        top: r.top,
        left: target.edge === "left" ? r.left : r.right,
        width: 0,
        height: r.height,
      };

  return (
    <div
      data-role="drop-indicator"
      className="drop-indicator-line"
      data-axis={target.axis}
      style={style}
    />
  );
}

export function DropIndicator({ registry, target }: Props) {
  useShadowSheet(css);
  if (target.kind === "container")
    return <ContainerHighlight registry={registry} target={target} />;
  return <LineIndicator registry={registry} target={target} />;
}
