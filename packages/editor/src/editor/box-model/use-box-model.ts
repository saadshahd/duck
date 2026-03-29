import { autoUpdate } from "@floating-ui/react";
import { useState, useCallback, useEffect } from "react";
import type { FiberRegistry } from "../fiber/index.js";
import { readBoxModel, type BoxModelData } from "./read-box-model.js";

/** Reactive box model data for a selected element, synced via autoUpdate. */
export function useBoxModel(
  registry: FiberRegistry | null,
  elementId: string | null,
): BoxModelData | null {
  const [data, setData] = useState<BoxModelData | null>(null);

  const sync = useCallback(() => {
    const el = registry && elementId ? registry.get(elementId) : null;
    setData(el ? readBoxModel(el) : null);
  }, [registry, elementId]);

  useEffect(() => {
    const el = registry && elementId ? registry.get(elementId) : null;
    if (!el) return void setData(null);
    const vRef = { getBoundingClientRect: () => el.getBoundingClientRect() };
    return autoUpdate(vRef, el, sync, { animationFrame: true });
  }, [registry, elementId, sync]);

  return data;
}
