import { useEffect, useRef, useState } from "react";
import { useShadowSheet } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import type { Axis } from "../layout/index.js";
import css from "./selection.css?inline";

type ArrowPositions = {
  prev: { top: number; left: number };
  next: { top: number; left: number };
};

function derivePositions(rect: DOMRect, axis: Axis): ArrowPositions {
  if (axis === "horizontal") {
    return {
      prev: { top: rect.top + rect.height / 2, left: rect.left - 28 },
      next: { top: rect.top + rect.height / 2, left: rect.right + 4 },
    };
  }
  return {
    prev: { top: rect.top - 28, left: rect.left + rect.width / 2 },
    next: { top: rect.bottom + 4, left: rect.left + rect.width / 2 },
  };
}

const ARIA_LABELS: Record<Axis, { prev: string; next: string }> = {
  horizontal: { prev: "Move left", next: "Move right" },
  vertical: { prev: "Move up", next: "Move down" },
};

const ARROW_GLYPHS: Record<Axis, { prev: string; next: string }> = {
  horizontal: { prev: "←", next: "→" },
  vertical: { prev: "↑", next: "↓" },
};

export function EdgeArrows({
  elementId,
  registry,
  axis,
  canMovePrev,
  canMoveNext,
  onMovePrev,
  onMoveNext,
}: {
  elementId: string;
  registry: FiberRegistry;
  axis: Axis;
  canMovePrev: boolean;
  canMoveNext: boolean;
  onMovePrev: () => void;
  onMoveNext: () => void;
}) {
  useShadowSheet(css);

  const [positions, setPositions] = useState<ArrowPositions | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let live = true;

    function tick() {
      if (!live) return;
      const el = registry.get(elementId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setPositions(derivePositions(rect, axis));
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      live = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [registry, elementId, axis]);

  if (!positions) return null;

  const labels = ARIA_LABELS[axis];
  const glyphs = ARROW_GLYPHS[axis];

  return (
    <>
      {canMovePrev && (
        <button
          type="button"
          className="edge-arrow"
          aria-label={labels.prev}
          data-role="edge-arrow-prev"
          data-axis={axis}
          style={{ top: positions.prev.top, left: positions.prev.left }}
          onClick={onMovePrev}
        >
          {glyphs.prev}
        </button>
      )}
      {canMoveNext && (
        <button
          type="button"
          className="edge-arrow"
          aria-label={labels.next}
          data-role="edge-arrow-next"
          data-axis={axis}
          style={{ top: positions.next.top, left: positions.next.left }}
          onClick={onMoveNext}
        >
          {glyphs.next}
        </button>
      )}
    </>
  );
}
