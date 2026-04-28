import type { Data } from "@puckeditor/core";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { Result } from "neverthrow";
import { getChildrenAt } from "@duck/spec";
import type { FiberRegistry } from "../fiber/index.js";
import { move, type SpecOpsError } from "../spec-ops/index.js";
import type { EditorEvent } from "../machine/index.js";
import {
  readData,
  resolveSlotAxis,
  resolveDropIndex,
  resolveInsertIndex,
} from "./helpers.js";

type TargetBag = { data: Record<string | symbol, unknown> };

type DropResult = {
  newData: Result<Data, SpecOpsError>;
  event: EditorEvent;
};

/**
 * Pure function: computes the data mutation and machine event for a drop.
 * Returns null when the drop should be cancelled (no target, self-drop, descendant).
 */
export function resolveDrop(
  source: TargetBag,
  target: TargetBag | undefined,
  data: Data,
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

  // Drop INTO container — append at end of the targeted slot
  if (targetData.role === "container") {
    const slotKey = targetData.containerSlotKey ?? null;
    const slotChildren = getChildrenAt(data, targetData.elementId, slotKey);
    const toIndex = slotChildren?.length ?? 0;
    return {
      newData: move(
        data,
        sourceData.elementId,
        targetData.elementId,
        slotKey,
        toIndex,
      ),
      event: {
        type: "DROP",
        sourceParentId: sourceData.parentId,
        targetParentId: targetData.elementId,
        fromIndex: sourceData.index,
        toIndex,
      },
    };
  }

  // Same-slot reorder
  if (
    targetData.parentId === sourceData.parentId &&
    targetData.slotKey === sourceData.slotKey
  ) {
    const axis =
      resolveSlotAxis(
        data,
        sourceData.parentId,
        sourceData.slotKey,
        registry,
      ) ?? "vertical";
    const to = resolveDropIndex(sourceData.index, target, axis);
    return {
      newData: move(
        data,
        sourceData.elementId,
        sourceData.parentId,
        sourceData.slotKey,
        to,
      ),
      event: {
        type: "DROP",
        sourceParentId: sourceData.parentId,
        targetParentId: sourceData.parentId,
        fromIndex: sourceData.index,
        toIndex: to,
      },
    };
  }

  // Cross-slot sibling drop
  const edge = extractClosestEdge(target.data);
  const insertIndex = resolveInsertIndex(targetData.index, edge);
  return {
    newData: move(
      data,
      sourceData.elementId,
      targetData.parentId,
      targetData.slotKey,
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
