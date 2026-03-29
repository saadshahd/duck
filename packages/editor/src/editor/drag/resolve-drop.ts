import type { Spec } from "@json-render/core";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { Result } from "neverthrow";
import type { FiberRegistry } from "../fiber/index.js";
import type { SpecOpsError } from "../spec-ops/index.js";
import { reorderChild, moveChild } from "../spec-ops/index.js";
import type { EditorEvent } from "../machine/index.js";
import {
  readData,
  resolveParentAxis,
  resolveDropIndex,
  resolveInsertIndex,
} from "./helpers.js";

type TargetBag = { data: Record<string | symbol, unknown> };

type DropResult = {
  newSpec: Result<Spec, SpecOpsError>;
  event: EditorEvent;
};

/**
 * Pure function: computes the spec mutation and machine event for a drop.
 * Returns null when the drop should be cancelled (no target, self-drop, descendant).
 */
export function resolveDrop(
  source: TargetBag,
  target: TargetBag | undefined,
  spec: Spec,
  registry: FiberRegistry,
  descendantSet: ReadonlySet<string>,
): DropResult | null {
  if (!target) return null;

  const sourceData = readData(source.data);
  const targetData = readData(target.data);

  if (
    targetData.elementId === sourceData.elementId ||
    descendantSet.has(targetData.elementId)
  )
    return null;

  // Drop INTO container — append at end
  if (targetData.role === "container") {
    const tgtChildren = spec.elements[targetData.elementId]?.children ?? [];
    return {
      newSpec: moveChild(
        spec,
        sourceData.parentId,
        sourceData.index,
        targetData.elementId,
        tgtChildren.length,
      ),
      event: {
        type: "DROP",
        sourceParentId: sourceData.parentId,
        targetParentId: targetData.elementId,
        fromIndex: sourceData.index,
        toIndex: tgtChildren.length,
      },
    };
  }

  // Same-parent reorder
  if (targetData.parentId === sourceData.parentId) {
    const axis =
      resolveParentAxis(spec, sourceData.parentId, registry) ?? "vertical";
    const to = resolveDropIndex(sourceData.index, target, axis);
    return {
      newSpec:
        sourceData.index !== to
          ? reorderChild(spec, sourceData.parentId, sourceData.index, to)
          : reorderChild(spec, sourceData.parentId, 0, 0), // will err with same-index — harmless
      event: {
        type: "DROP",
        sourceParentId: sourceData.parentId,
        targetParentId: sourceData.parentId,
        fromIndex: sourceData.index,
        toIndex: to,
      },
    };
  }

  // Cross-parent sibling drop
  const edge = extractClosestEdge(target.data);
  const insertIndex = resolveInsertIndex(targetData.index, edge);
  return {
    newSpec: moveChild(
      spec,
      sourceData.parentId,
      sourceData.index,
      targetData.parentId,
      insertIndex,
    ),
    event: {
      type: "DROP",
      sourceParentId: sourceData.parentId,
      targetParentId: targetData.parentId,
      fromIndex: sourceData.index,
      toIndex: insertIndex,
    },
  };
}
