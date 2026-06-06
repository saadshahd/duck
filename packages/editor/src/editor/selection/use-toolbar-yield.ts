import { useEffect, useRef, useState } from "react";
import type { FiberRegistry } from "../fiber/index.js";

/**
 * The selection toolbar must never sit in the drag path. A pointerdown over the
 * selected (draggable) element is the moment a drag could begin: yield then,
 * restore on a pointerup that wasn't a drag. Native HTML5 drag may swallow
 * pointerup (dragend fires instead), so dragend also clears the latch — and the
 * shell additionally gates on drag state, so the latch can never strand the bar.
 */
export function useToolbarYield(
  registry: FiberRegistry | null,
  selectedId: string | null,
): boolean {
  const [yielding, setYielding] = useState(false);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  useEffect(
    function wireDragPathYield() {
      if (!registry) return;

      const onPointerDown = (e: PointerEvent) => {
        const id = selectedIdRef.current;
        if (!id) return;
        const selectedEl = registry.get(id);
        if (!selectedEl) return;
        if (e.target instanceof Node && selectedEl.contains(e.target))
          setYielding(true);
      };

      const release = () => setYielding(false);

      document.addEventListener("pointerdown", onPointerDown, {
        capture: true,
      });
      document.addEventListener("pointerup", release);
      document.addEventListener("dragend", release);

      return () => {
        document.removeEventListener("pointerdown", onPointerDown, {
          capture: true,
        });
        document.removeEventListener("pointerup", release);
        document.removeEventListener("dragend", release);
      };
    },
    [registry],
  );

  return yielding;
}
