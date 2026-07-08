import { useMemo } from "react";
import type { Data } from "@puckeditor/core";
import { findById, findParent, slotKeyOf } from "@duckeditor/spec";
import { qualifiedLabel } from "../layout/index.js";

/** The `Component › slot` address of the slot an element lives in, or undefined
 *  for root-content elements (no slot parent). Drives the chip's slot line and
 *  the slot-stop label. */
export function useSlotAddress(
  data: Data,
  elementId: string | null,
): string | undefined {
  return useMemo(() => {
    if (!elementId) return undefined;
    const parent = findParent(data, elementId);
    if (parent?.at !== "slot") return undefined;
    const parentEl = findById(data, parent.parentId);
    if (!parentEl) return undefined;
    return qualifiedLabel(parentEl.type, slotKeyOf(parent.path));
  }, [data, elementId]);
}
