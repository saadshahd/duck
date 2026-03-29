import { useShadowSheet } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import type { GapInfo } from "./read-box-model.js";
import css from "./box-model.css?inline";

type GapRegion = { style: React.CSSProperties; value: number };

function computeGapRegions(el: HTMLElement, gap: GapInfo): GapRegion[] {
  const children = Array.from(el.children) as HTMLElement[];
  if (children.length < 2) return [];

  const cs = getComputedStyle(el);
  const isColumn =
    cs.flexDirection === "column" || cs.flexDirection === "column-reverse";
  const gapValue = isColumn ? gap.row : gap.column;
  if (gapValue === 0) return [];

  const parentRect = el.getBoundingClientRect();

  return children.slice(0, -1).map((child, i) => {
    const next = children[i + 1];
    const aCs = getComputedStyle(child);
    const bCs = getComputedStyle(next);
    const a = child.getBoundingClientRect();
    const b = next.getBoundingClientRect();

    // getBoundingClientRect excludes margins, so the space between rects
    // is gap + child's trailing margin + next child's leading margin.
    // Inset by those margins to isolate the true gap region.
    const region = isColumn
      ? {
          top: a.bottom + (parseFloat(aCs.marginBottom) || 0),
          left: parentRect.left,
          width: parentRect.width,
          height:
            b.top -
            a.bottom -
            (parseFloat(aCs.marginBottom) || 0) -
            (parseFloat(bCs.marginTop) || 0),
        }
      : {
          top: parentRect.top,
          left: a.right + (parseFloat(aCs.marginRight) || 0),
          width:
            b.left -
            a.right -
            (parseFloat(aCs.marginRight) || 0) -
            (parseFloat(bCs.marginLeft) || 0),
          height: parentRect.height,
        };

    return { style: region, value: gapValue };
  });
}

export function GapOverlay({
  registry,
  elementId,
  gap,
}: {
  registry: FiberRegistry;
  elementId: string;
  gap: GapInfo;
}) {
  useShadowSheet(css);
  const el = registry.get(elementId);
  if (!el) return null;

  const regions = computeGapRegions(el, gap);

  return (
    <>
      {regions.map((region, i) => (
        <div
          key={i}
          className="box-model-layer box-model-gap"
          style={region.style}
        >
          <span
            className="box-model-label"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {region.value}
          </span>
        </div>
      ))}
    </>
  );
}
