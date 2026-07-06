import { useEffect } from "react";
import type { FiberRegistry } from "../fiber/index.js";

/** Smoothly scroll the focused element to viewport center on the sheet-open /
 *  elementId-change edge, so the designer always sees what they are editing. */
export function useScrollIntoCenter({
  registry,
  elementId,
  active,
}: {
  registry: FiberRegistry | null;
  elementId?: string;
  active: boolean;
}): void {
  useEffect(() => {
    if (!active || !elementId) return;
    registry?.get(elementId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [registry, elementId, active]);
}
