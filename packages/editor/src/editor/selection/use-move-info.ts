import { useMemo } from "react";
import type { Spec } from "@json-render/core";
import type { FiberRegistry } from "../fiber/index.js";
import { type Axis, resolveParentAxis } from "../layout/index.js";
import { findParent } from "../spec-ops/index.js";

export type MoveInfo = {
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
  spec: Spec,
  lastSelectedId: string | null,
  registry: FiberRegistry | null,
): MoveInfo {
  return useMemo(() => {
    if (!lastSelectedId || !registry) return DISABLED;

    const parent = findParent(spec, lastSelectedId);
    if (parent.isErr()) return DISABLED;

    const { parentId, childIndex } = parent.value;
    const children = spec.elements[parentId]?.children;
    if (!children) return DISABLED;

    const axis = resolveParentAxis(spec, parentId, registry) ?? "vertical";
    return {
      axis,
      canMovePrev: childIndex > 0,
      canMoveNext: childIndex < children.length - 1,
    };
  }, [spec, lastSelectedId, registry]);
}
