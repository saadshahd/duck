import { useMemo } from "react";
import type { Data } from "@puckeditor/core";
import { getChildrenAt, findParent } from "@duck/spec";
import type { FiberRegistry } from "../fiber/index.js";
import { type Axis, resolveSlotAxis } from "../layout/index.js";

type MoveInfo = {
  axis: Axis;
  canMovePrev: boolean;
  canMoveNext: boolean;
};

const DISABLED: MoveInfo = {
  axis: "vertical",
  canMovePrev: false,
  canMoveNext: false,
};

export function useMoveInfo(
  data: Data,
  lastSelectedId: string | null,
  registry: FiberRegistry | null,
): MoveInfo {
  return useMemo(() => {
    if (!lastSelectedId || !registry) return DISABLED;

    const parent = findParent(data, lastSelectedId);
    if (!parent) return DISABLED;

    const siblings = getChildrenAt(data, parent.parentId, parent.slotKey);
    if (!siblings) return DISABLED;

    const axis =
      resolveSlotAxis(data, parent.parentId, parent.slotKey, registry) ??
      "vertical";
    return {
      axis,
      canMovePrev: parent.index > 0,
      canMoveNext: parent.index < siblings.length - 1,
    };
  }, [data, lastSelectedId, registry]);
}
