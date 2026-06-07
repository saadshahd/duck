import { useEffect } from "react";
import type { UseFloatingReturn } from "@floating-ui/react";
import type { FiberRegistry } from "../fiber/index.js";
import { ZERO_RECT } from "../layout/index.js";

/** A live `getBoundingClientRect` reading a registered element's rect, collapsing
 *  an absent element to a zero rect. Shared by the element and `useAnchor` paths. */
export const registryRect =
  (registry: FiberRegistry, elementId: string | null) => (): DOMRect =>
    (elementId
      ? registry.get(elementId)?.getBoundingClientRect()
      : undefined) ?? ZERO_RECT;

export function useRegistryAnchor(
  refs: UseFloatingReturn["refs"],
  registry: FiberRegistry,
  elementId: string | null,
): void {
  useEffect(() => {
    refs.setPositionReference({
      getBoundingClientRect: registryRect(registry, elementId),
    });
  }, [refs, registry, elementId]);
}
