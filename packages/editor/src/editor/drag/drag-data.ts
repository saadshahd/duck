import {
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import type { ParentSite } from "@duckeditor/spec";
import type { Axis } from "../layout/index.js";

// --- Drag data bag ---

/** Typed shape stored in pragmatic-dnd's untyped userData bag. The dragged
 *  element's own site (root or slot), plus its index and role. */
export type DragData = ParentSite & {
  elementId: string;
  index: number;
  role: "sibling" | "container";
};

/** Single boundary cast — all downstream code is type-safe. */
export const readData = (bag: Record<string | symbol, unknown>) =>
  bag as DragData;

// --- Axis & edges ---

export { resolveSlotAxis } from "../layout/index.js";

export const EDGES: Record<Axis, Edge[]> = {
  vertical: ["top", "bottom"],
  horizontal: ["left", "right"],
};

// --- Drop index ---

/** Resolve a same-slot reorder destination index. */
export const resolveDropIndex = (
  sourceIndex: number,
  target: { data: Record<string | symbol, unknown> },
  axis: Axis,
): number => {
  const { index: targetIndex } = readData(target.data);
  return getReorderDestinationIndex({
    startIndex: sourceIndex,
    indexOfTarget: targetIndex,
    closestEdgeOfTarget: extractClosestEdge(target.data),
    axis,
  });
};

/** Resolve a cross-slot insert index from edge position. */
export const resolveInsertIndex = (
  targetIndex: number,
  edge: Edge | null,
): number =>
  edge === "bottom" || edge === "right" ? targetIndex + 1 : targetIndex;
