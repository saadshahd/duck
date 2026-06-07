import { autoUpdate } from "@floating-ui/react";
import { useEffect, useRef, useCallback } from "react";
import type { FiberRegistry } from "../fiber/index.js";
import { ZERO_RECT } from "../layout/index.js";
import { tetherEndpoints } from "./sheet-geometry.js";

/** Live-track the selected element's rect onto the cutout div and the tether
 *  <line>, on the same animationFrame autoUpdate cadence as use-slot-stop-rect.
 *  Writes DOM geometry only — never React state. `data-tracking` is set during
 *  the rAF loop so the cutout's retarget transition is suppressed while the
 *  element moves under scroll; the consumer clears it on retarget. */
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
    cutout.setAttribute("data-tracking", "");
    const vRef = {
      getBoundingClientRect: () =>
        registry.get(elementId)?.getBoundingClientRect() ?? ZERO_RECT,
    };
    return autoUpdate(vRef, cutout, sync, { animationFrame: true });
  }, [registry, elementId, sync]);

  return { cutoutRef, lineRef };
}
