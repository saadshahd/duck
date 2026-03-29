import type { Spec } from "@json-render/core";
import {
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import type { FiberRegistry } from "../fiber/index.js";
import type { Axis } from "./drop-indicator.js";

// --- Drag data bag ---

/** Typed shape stored in pragmatic-dnd's untyped userData bag. */
export type DragData = {
  elementId: string;
  parentId: string;
  index: number;
  role: "sibling" | "container";
};

/** Single boundary cast — all downstream code is type-safe. */
export const readData = (bag: Record<string | symbol, unknown>) =>
  bag as DragData;

// --- Axis & edges ---

export const EDGES: Record<Axis, Edge[]> = {
  vertical: ["top", "bottom"],
  horizontal: ["left", "right"],
};

/** Measure geometry of two adjacent siblings to determine layout axis. */
export const detectAxis = (a: DOMRect, b: DOMRect): Axis => {
  const dy = Math.abs(a.top + a.height / 2 - (b.top + b.height / 2));
  const dx = Math.abs(a.left + a.width / 2 - (b.left + b.width / 2));
  return dy > dx ? "vertical" : "horizontal";
};

/** Resolve axis for a parent by measuring its first two children. */
export const resolveParentAxis = (
  spec: Spec,
  parentId: string,
  registry: FiberRegistry,
): Axis | null => {
  const children = spec.elements[parentId]?.children;
  if (!children || children.length < 2) return null;
  const a = registry.get(children[0]);
  const b = registry.get(children[1]);
  if (!a || !b) return null;
  return detectAxis(a.getBoundingClientRect(), b.getBoundingClientRect());
};

// --- Zone detection ---

const CONTAINER_THRESHOLD = 0.2;

/** True when cursor is in the inner 60% of the element (container drop zone). */
export const isInContainerZone = (
  input: { clientX: number; clientY: number },
  rect: DOMRect,
): boolean => {
  const x = (input.clientX - rect.left) / rect.width;
  const y = (input.clientY - rect.top) / rect.height;
  return (
    x > CONTAINER_THRESHOLD &&
    x < 1 - CONTAINER_THRESHOLD &&
    y > CONTAINER_THRESHOLD &&
    y < 1 - CONTAINER_THRESHOLD
  );
};

// --- Drop index ---

/** Resolve a same-parent reorder destination index. */
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

/** Resolve a cross-parent insert index from edge position. */
export const resolveInsertIndex = (
  targetIndex: number,
  edge: Edge | null,
): number =>
  edge === "bottom" || edge === "right" ? targetIndex + 1 : targetIndex;

// --- View transitions ---

export const tagTransitionNames = (reg: FiberRegistry, ids: string[]) => {
  const restores = ids.flatMap((id) => {
    const el = reg.get(id);
    if (!el) return [];
    const prev = el.style.viewTransitionName;
    el.style.viewTransitionName = id;
    return [
      () => {
        el.style.viewTransitionName = prev;
      },
    ];
  });
  return () => restores.forEach((fn) => fn());
};
