import { useCallback } from "react";
import type { Spec } from "@json-render/core";
import type { EditorEvent, EditorSnapshot } from "../machine/index.js";
import type { Axis } from "../layout/index.js";
import {
  findParent,
  reorderChild,
  deleteElement,
  deleteElements,
  nearestSibling,
} from "../spec-ops/index.js";
import { animatedUpdate } from "../animated-update.js";
import type { SpecPush } from "../types.js";
import type { EditorAction } from "./action-bar.js";

const MOVE_LABELS: Record<Axis, { prev: string; next: string }> = {
  vertical: { prev: "up", next: "down" },
  horizontal: { prev: "left", next: "right" },
};

export function useActionHandler({
  spec,
  state,
  send,
  push,
  axis,
}: {
  spec: Spec;
  state: EditorSnapshot;
  send: (event: EditorEvent) => void;
  push: SpecPush;
  axis: Axis;
}): (action: EditorAction) => void {
  return useCallback(
    (action: EditorAction) => {
      const { selectedIds, lastSelectedId } = state.context;
      if (selectedIds.size === 0 || !lastSelectedId) return;

      const type = spec.elements[lastSelectedId]?.type ?? "element";
      const labels = MOVE_LABELS[axis];

      switch (action.tag) {
        case "insert":
          send({ type: "OPEN_INSERT" });
          break;
        case "edit":
          send({ type: "OPEN_POPOVER" });
          break;
        case "move-up":
          if (selectedIds.size > 1) return;
          findParent(spec, lastSelectedId)
            .andThen(({ parentId, childIndex }) =>
              reorderChild(spec, parentId, childIndex, childIndex - 1),
            )
            .map((next) =>
              animatedUpdate(
                (s) =>
                  push(
                    s,
                    `Moved ${type} ${labels.prev}`,
                    `move:${lastSelectedId}`,
                  ),
                next,
              ),
            );
          break;
        case "move-down":
          if (selectedIds.size > 1) return;
          findParent(spec, lastSelectedId)
            .andThen(({ parentId, childIndex }) =>
              reorderChild(spec, parentId, childIndex, childIndex + 1),
            )
            .map((next) =>
              animatedUpdate(
                (s) =>
                  push(
                    s,
                    `Moved ${type} ${labels.next}`,
                    `move:${lastSelectedId}`,
                  ),
                next,
              ),
            );
          break;
        case "delete":
          if (selectedIds.size > 1) {
            deleteElements(spec, selectedIds).map(({ spec: next }) => {
              push(next, `Deleted ${selectedIds.size} elements`);
              send({ type: "DESELECT" });
            });
          } else {
            deleteElement(spec, lastSelectedId).map(
              ({ spec: next, parentId }) => {
                push(next, `Deleted ${type}`);
                send({
                  type: "SELECT",
                  elementId: nearestSibling(spec, parentId, lastSelectedId),
                });
              },
            );
          }
          break;
      }
    },
    [
      spec,
      state.context.selectedIds,
      state.context.lastSelectedId,
      push,
      send,
      axis,
    ],
  );
}
