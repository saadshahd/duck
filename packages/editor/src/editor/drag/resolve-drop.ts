import type { Data } from "@puckeditor/core";
import type { Result } from "neverthrow";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import { findParent } from "@duckeditor/spec";
import { move, type SpecOpsError } from "../spec-ops/index.js";
import type { EditorEvent } from "../machine/index.js";
import type { DropTarget } from "../layout/index.js";
import { readData, resolveInsertIndex } from "./helpers.js";

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
  descendantSet,
}: {
  source: TargetBag;
  target?: TargetBag;
  indicator: DropTarget | null;
  data: Data;
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

  // No indicator, or an explicit no-target → cancel.
  if (!indicator || indicator.kind === "none") return null;

  // Line indicator: commit from the indicator's elementId + edge, not from the
  // drop target bag. This handles both ordinary sibling lines and same-parent
  // container siblings (whose bags carry no closest-edge data).
  if (indicator.kind === "line") {
    const parent = findParent(data, indicator.elementId);
    if (!parent) return null;
    // Same-slot reorder must account for the source's removal, or a forward
    // move lands one position too far. Cross-slot inserts have no such shift.
    const sameSlot =
      parent.parentId === sourceData.parentId &&
      parent.slotKey === sourceData.slotKey;
    const insertIndex = sameSlot
      ? getReorderDestinationIndex({
          startIndex: sourceData.index,
          indexOfTarget: parent.index,
          closestEdgeOfTarget: indicator.edge,
          axis: indicator.axis,
        })
      : resolveInsertIndex(parent.index, indicator.edge);
    return {
      newData: move(
        data,
        sourceData.elementId,
        parent.parentId,
        parent.slotKey,
        insertIndex,
      ),
      event: {
        type: "DROP",
        sourceParentId: sourceData.parentId,
        targetParentId: parent.parentId,
        fromIndex: sourceData.index,
        toIndex: insertIndex,
      },
    };
  }

  // Cycle-selected root content — commit the destination index verbatim.
  if (indicator.kind === "root") {
    return {
      newData: move(data, sourceData.elementId, null, null, indicator.index),
      event: {
        type: "DROP",
        sourceParentId: sourceData.parentId,
        targetParentId: null,
        fromIndex: sourceData.index,
        toIndex: indicator.index,
      },
    };
  }

  // Drop INTO a container — commit what the indicator showed, verbatim.
  // `indicator` is now narrowed to `{ kind: "container" }`.
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
