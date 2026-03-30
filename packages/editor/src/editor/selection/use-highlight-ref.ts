import { autoUpdate } from "@floating-ui/react";
import { useEffect, useRef, useCallback } from "react";
import type { FiberRegistry } from "../fiber/index.js";

export const INSET = -2; // border extends outside element bounds (system.md)
export const EXPAND = 4; // 2px border on each side

const clearRect = (div: HTMLDivElement) => {
  div.style.top = "";
  div.style.left = "";
  div.style.width = "";
  div.style.height = "";
};

export function useHighlightRef(
  registry: FiberRegistry,
  elementId: string,
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  const sync = useCallback(() => {
    const el = registry.get(elementId);
    const div = ref.current;
    if (!div) return;
    if (!el) return clearRect(div);
    const r = el.getBoundingClientRect();
    div.style.top = `${r.top + INSET}px`;
    div.style.left = `${r.left + INSET}px`;
    div.style.width = `${r.width + EXPAND}px`;
    div.style.height = `${r.height + EXPAND}px`;
  }, [registry, elementId]);

  useEffect(() => {
    const el = registry.get(elementId);
    const div = ref.current;
    if (!el || !div) {
      if (div) clearRect(div);
      return;
    }
    const vRef = { getBoundingClientRect: () => el.getBoundingClientRect() };
    return autoUpdate(vRef, div, sync, { animationFrame: true });
  }, [registry, elementId, sync]);

  return ref;
}
