import { useEffect } from "react";
import type { FiberRegistry } from "../fiber/index.js";

/** Smoothly scroll a registered element to viewport center, so the designer
 *  always sees what they just focused. A no-op when the element is unregistered. */
export function centerInView(
  registry: FiberRegistry | null,
  elementId: string,
): void {
  registry?.get(elementId)?.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
}

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
    centerInView(registry, elementId);
  }, [registry, elementId, active]);
}
