import { useEffect, useRef, useCallback } from "react";
import type { FiberRegistry } from "../fiber/index.js";
import { ZERO_RECT } from "../layout/index.js";
import { tetherEndpoints } from "./sheet-geometry.js";

/** Live-track the selected element's rect onto the cutout div and the tether
 *  <line> via an unconditional rAF loop. Every frame re-queries
 *  getBoundingClientRect() on the live DOM element so the cutout and tether
 *  stay locked regardless of scroll, layout shift, or resize.
 *  `data-tracking` is set for the lifetime of the sheet to suppress CSS
 *  position transitions (which would fight the per-frame DOM writes). */
export function useSheetAnchor(
  registry: FiberRegistry,
  elementId: string,
): {
  cutoutRef: React.RefObject<HTMLDivElement | null>;
  lineRef: React.RefObject<SVGLineElement | null>;
} {
  const cutoutRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);

  const sync = useCallback(() => {
    const cutout = cutoutRef.current;
    const line = lineRef.current;
    const r = registry.get(elementId)?.getBoundingClientRect() ?? ZERO_RECT;
    if (cutout) {
      cutout.style.top = `${r.top}px`;
      cutout.style.left = `${r.left}px`;
      cutout.style.width = `${r.width}px`;
      cutout.style.height = `${r.height}px`;
    }
    if (line) {
      const e = tetherEndpoints(r, {
        width: window.innerWidth,
        height: window.innerHeight,
      });
      line.setAttribute("x1", `${e.x1}`);
      line.setAttribute("y1", `${e.y1}`);
      line.setAttribute("x2", `${e.x2}`);
      line.setAttribute("y2", `${e.y2}`);
      // Show/hide only — the stroke opacity (0.35) is baked into --tether-stroke
      // (the single source of truth per the conformed docs), never set inline.
      line.style.visibility = e.hidden ? "hidden" : "visible";
    }
  }, [registry, elementId]);

  useEffect(() => {
    const cutout = cutoutRef.current;
    if (!cutout) return;
    // Suppress CSS position transitions for the lifetime of the rAF loop —
    // they fight per-frame style writes and cause the cutout to lag behind.
    cutout.setAttribute("data-tracking", "");
    let frameId: number;
    function loop() {
      sync();
      frameId = requestAnimationFrame(loop);
    }
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [sync]);

  return { cutoutRef, lineRef };
}
