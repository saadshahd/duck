import type { Data } from "@puckeditor/core";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { Result } from "neverthrow";
import type { FiberRegistry } from "../fiber/index.js";
import { move, type SpecOpsError } from "../spec-ops/index.js";
import type { EditorEvent } from "../machine/index.js";
import type { DropTarget } from "./drop-indicator.js";
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
 * Container drops commit the last indicator's `(elementId, slotKey, index)`
 * verbatim — never recomputed. A missing or stale indicator cancels the drop.
 * Returns null when the drop should be cancelled (no target, self-drop, descendant).
 */
export function resolveDrop({
  source,
  target,
  indicator,
  data,
  registry,
  descendantSet,
}: {
  source: TargetBag;
  target?: TargetBag;
  indicator: DropTarget | null;
  data: Data;
  registry: FiberRegistry;
  descendantSet: ReadonlySet<string>;
}): DropResult | null {
  if (!target) return null;

  const sourceData = readData(source.data);
  const targetData = readData(target.data);

  if (
    targetData.elementId === sourceData.elementId ||
    descendantSet.has(targetData.elementId)
  )
    return null;

  // No indicator → resolveIndicator ruled the position out. Cancel.
  if (!indicator) return null;

  // Drop INTO a container — commit what the indicator showed, verbatim
  if (indicator.kind === "container") {
    return {
      newData: move(
        data,
        sourceData.elementId,
        indicator.elementId,
        indicator.slotKey,
        indicator.index,
      ),
      event: {
        type: "DROP",
        sourceParentId: sourceData.parentId,
        targetParentId: indicator.elementId,
        fromIndex: sourceData.index,
        toIndex: indicator.index,
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
