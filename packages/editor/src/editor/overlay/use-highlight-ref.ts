import { autoUpdate } from "@floating-ui/react";
import { useEffect, useRef, useCallback } from "react";
import type { Data } from "@puckeditor/core";
import type { FiberRegistry } from "../fiber/index.js";
import type { Target } from "../machine/index.js";
import { rectOf, ZERO_RECT } from "../layout/index.js";

export const INSET = -2;
export const EXPAND = 4;

const clearRect = (div: HTMLDivElement) => {
  div.style.top = "";
  div.style.left = "";
  div.style.width = "";
  div.style.height = "";
};

/** Position a div ref to track a target's live rect.
 *  RAF-driven via @floating-ui's `autoUpdate`. */
export function useTargetRect(
  registry: FiberRegistry,
  data: Data,
  target: Target,
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const sync = useCallback(() => {
    const div = ref.current;
    if (!div) return;
    const r = rectOf(registry, dataRef.current, target);
    if (!r) return clearRect(div);
    div.style.top = `${r.top + INSET}px`;
    div.style.left = `${r.left + INSET}px`;
    div.style.width = `${r.width + EXPAND}px`;
    div.style.height = `${r.height + EXPAND}px`;
  }, [registry, target]);

  useEffect(() => {
    const div = ref.current;
    if (!div) return;
    const vRef = {
      getBoundingClientRect: () =>
        rectOf(registry, dataRef.current, target) ?? ZERO_RECT,
    };
    return autoUpdate(vRef, div, sync, { animationFrame: true });
  }, [registry, target, sync]);

  return ref;
}
