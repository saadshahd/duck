import { autoUpdate } from "@floating-ui/react";
import { useEffect, useRef, useCallback } from "react";
import type { Data } from "@puckeditor/core";
import type { FiberRegistry } from "../fiber/index.js";
import { ZERO_RECT, slotChoiceRect } from "../layout/index.js";

/** The measured rect of a slot for its overlay band: one slot's tile from the
 *  container tiling, so every slot of a node — including empty ones — gets a
 *  distinct, non-overlapping band. Falls back to the parent element's rect when
 *  the slot is absent from the tiling. */
export const measureSlot = (args: {
  registry: FiberRegistry;
  data: Data;
  parentId: string;
  slotKey: string;
}): DOMRect => {
  const { registry, data, parentId, slotKey } = args;
  return (
    slotChoiceRect({ data, parentId, slotKey, registry }) ??
    registry.get(parentId)?.getBoundingClientRect() ??
    ZERO_RECT
  );
};

/** Live-track a slot's measured rect onto a band div and a corner label, with
 *  the same animationFrame autoUpdate cadence as the other overlay anchors so
 *  the band stays attached through scroll and layout shifts. */
export function useSlotStopRect(args: {
  registry: FiberRegistry;
  data: Data;
  parentId: string;
  slotKey: string;
}): {
  bandRef: React.RefObject<HTMLDivElement | null>;
  labelRef: React.RefObject<HTMLButtonElement | null>;
} {
  const { registry, data, parentId, slotKey } = args;
  const bandRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLButtonElement>(null);

  const sync = useCallback(() => {
    const band = bandRef.current;
    const label = labelRef.current;
    const r = measureSlot({ registry, data, parentId, slotKey });
    if (band) {
      band.style.top = `${r.top}px`;
      band.style.left = `${r.left}px`;
      band.style.width = `${r.width}px`;
      band.style.height = `${r.height}px`;
    }
    if (label) {
      label.style.top = `${r.top}px`;
      label.style.left = `${r.left}px`;
    }
  }, [registry, data, parentId, slotKey]);

  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    const vRef = {
      getBoundingClientRect: () =>
        measureSlot({ registry, data, parentId, slotKey }),
    };
    return autoUpdate(vRef, band, sync, { animationFrame: true });
  }, [registry, data, parentId, slotKey, sync]);

  return { bandRef, labelRef };
}
