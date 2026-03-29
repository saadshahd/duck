import type { Spec } from "@json-render/core";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { FiberRegistry } from "../fiber/index.js";
import type { DropTarget } from "./drop-indicator.js";
import { readData, resolveParentAxis, resolveDropIndex } from "./helpers.js";

type TargetBag = { data: Record<string | symbol, unknown> };

/**
 * Pure function: given source/target drag data, returns the indicator to render.
 * Returns null when no indicator should be shown (self-drop, descendant, no-op).
 */
export function resolveIndicator(
  source: TargetBag,
  target: TargetBag | undefined,
  spec: Spec,
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
    resolveParentAxis(spec, targetData.parentId, registry) ?? "vertical";
  const edge = extractClosestEdge(target.data);
  if (!edge) return null;

  // Same-parent: hide indicator when drop would be a no-op
  if (targetData.parentId === sourceData.parentId) {
    const to = resolveDropIndex(sourceData.index, target, axis);
    if (to === sourceData.index) return null;
  }

  return { kind: "line", elementId: targetData.elementId, edge, axis };
}
