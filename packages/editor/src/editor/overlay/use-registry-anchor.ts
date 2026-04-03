import { useEffect } from "react";
import type { UseFloatingReturn } from "@floating-ui/react";
import type { FiberRegistry } from "../fiber/index.js";
import { ZERO_RECT } from "../layout/index.js";

export function useRegistryAnchor(
  refs: UseFloatingReturn["refs"],
  registry: FiberRegistry,
  elementId: string | null,
): void {
  useEffect(() => {
    refs.setPositionReference({
      getBoundingClientRect: () => {
        if (!elementId) return ZERO_RECT;
        const el = registry.get(elementId);
        return el?.getBoundingClientRect() ?? ZERO_RECT;
      },
    });
  }, [refs, registry, elementId]);
}
