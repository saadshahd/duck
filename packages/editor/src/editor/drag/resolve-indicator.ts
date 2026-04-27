import type { Data } from "@puckeditor/core";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { FiberRegistry } from "../fiber/index.js";
import type { DropTarget } from "./drop-indicator.js";
import { readData, resolveSlotAxis, resolveDropIndex } from "./helpers.js";

type TargetBag = { data: Record<string | symbol, unknown> };

/**
 * Pure function: given source/target drag data, returns the indicator to render.
 * Returns null when no indicator should be shown (self-drop, descendant, no-op).
 */
export function resolveIndicator(
  source: TargetBag,
  target: TargetBag | undefined,
  data: Data,
  registry: FiberRegistry,
  descendantSet: ReadonlySet<string>,
): DropTarget | null {
  if (!target) return null;

  const sourceData = readData(source.data);
  const targetData = readData(target.data);

  if (
    targetData.elementId === sourceData.elementId ||
    descendantSet.has(targetData.elementId)
  )
    return null;

  if (targetData.role === "container")
    return { kind: "container", elementId: targetData.elementId };

  const axis =
    resolveSlotAxis(data, targetData.parentId, targetData.slotKey, registry) ??
    "vertical";
  const edge = extractClosestEdge(target.data);
  if (!edge) return null;

  // Same-slot: hide indicator when drop would be a no-op
  if (
    targetData.parentId === sourceData.parentId &&
    targetData.slotKey === sourceData.slotKey
  ) {
    const to = resolveDropIndex(sourceData.index, target, axis);
    if (to === sourceData.index) return null;
  }

  return { kind: "line", elementId: targetData.elementId, edge, axis };
}
