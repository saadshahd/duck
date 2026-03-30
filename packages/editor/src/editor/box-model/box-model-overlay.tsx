import { useShadowSheet } from "../overlay/index.js";
import type { BoxModelData } from "./read-box-model.js";
import type { Edges } from "../layout/rect.js";
import { isZeroEdges } from "./read-box-model.js";
import css from "./box-model.css?inline";

const MIN_LABEL_STRIP = 14;

// ── Edge labels ──────────────────────────────────────────

type EdgeLabel = { value: number; style: React.CSSProperties };

function edgeLabels(
  outerRect: DOMRect,
  innerRect: DOMRect,
  edges: Edges,
): EdgeLabel[] {
  const labels: EdgeLabel[] = [];
  const midX = outerRect.x + outerRect.width / 2;
  const midY = outerRect.y + outerRect.height / 2;

  if (edges.top >= MIN_LABEL_STRIP)
    labels.push({
      value: edges.top,
      style: {
        left: midX,
        top: outerRect.y + edges.top / 2,
        transform: "translate(-50%, -50%)",
      },
    });
  if (edges.bottom >= MIN_LABEL_STRIP)
    labels.push({
      value: edges.bottom,
      style: {
        left: midX,
        top: innerRect.bottom + edges.bottom / 2,
        transform: "translate(-50%, -50%)",
      },
    });
  if (edges.left >= MIN_LABEL_STRIP)
    labels.push({
      value: edges.left,
      style: {
        left: outerRect.x + edges.left / 2,
        top: midY,
        transform: "translate(-50%, -50%)",
      },
    });
  if (edges.right >= MIN_LABEL_STRIP)
    labels.push({
      value: edges.right,
      style: {
        left: innerRect.right + edges.right / 2,
        top: midY,
        transform: "translate(-50%, -50%)",
      },
    });

  return labels;
}

// ── Nested band ──────────────────────────────────────────

/**
 * Renders a single band as a div that exposes its color as a strip
 * around a positioned child. The child covers the inner area, so only
 * the edges of this div's background are visible.
 */
function Band({
  className,
  edges,
  children,
}: {
  className: string;
  edges: Edges;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      {children && (
        <div
          style={{
            position: "absolute",
            top: edges.top,
            left: edges.left,
            right: edges.right,
            bottom: edges.bottom,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ── Component ────────────────────────────────────────────

export function BoxModelOverlay({ data }: { data: BoxModelData }) {
  useShadowSheet(css);
  // Outermost container positioned at marginRect
  const { marginRect } = data;

  // Labels for margin and padding only (border excluded from visualization)
  const allLabels: EdgeLabel[] = [
    ...(!isZeroEdges(data.margin)
      ? edgeLabels(data.marginRect, data.borderRect, data.margin)
      : []),
    ...(!isZeroEdges(data.padding)
      ? edgeLabels(data.paddingRect, data.contentRect, data.padding)
      : []),
  ];

  // Nested bands: margin → padding → content
  const content = <Band className="box-model-content" edges={data.padding} />;

  const padding = isZeroEdges(data.padding) ? (
    content
  ) : (
    <Band className="box-model-padding" edges={data.padding}>
      {content}
    </Band>
  );

  const margin = isZeroEdges(data.margin) ? (
    padding
  ) : (
    <Band className="box-model-margin" edges={data.margin}>
      {padding}
    </Band>
  );

  return (
    <>
      <div
        className="box-model-layer"
        style={{
          top: marginRect.y,
          left: marginRect.x,
          width: marginRect.width,
          height: marginRect.height,
        }}
      >
        {margin}
      </div>
      {allLabels.map((label, i) => (
        <span key={i} className="box-model-label" style={label.style}>
          {label.value}
        </span>
      ))}
    </>
  );
}
