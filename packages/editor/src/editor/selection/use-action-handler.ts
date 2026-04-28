import { useCallback } from "react";
import type { Data } from "@puckeditor/core";
import { findById, findParent, nearestSibling } from "@duck/spec";
import { ok, type Result } from "neverthrow";
import type { EditorEvent, EditorSnapshot } from "../machine/index.js";
import type { Axis } from "../layout/index.js";
import { move, remove, type SpecOpsError } from "../spec-ops/index.js";
import { animatedUpdate } from "../animated-update.js";
import type { DataPush } from "../types.js";
import type { EditorAction } from "./action-bar.js";

const MOVE_LABELS: Record<Axis, { prev: string; next: string }> = {
  vertical: { prev: "up", next: "down" },
  horizontal: { prev: "left", next: "right" },
};

const removeMany = (
  data: Data,
  ids: readonly string[],
): Result<Data, SpecOpsError> =>
  ids.reduce<Result<Data, SpecOpsError>>(
    (acc, id) => acc.andThen((d) => remove(d, id)),
    ok(data),
  );

export function useActionHandler({
  data,
  state,
  send,
  push,
  axis,
}: {
  data: Data;
  state: EditorSnapshot;
  send: (event: EditorEvent) => void;
  push: DataPush;
  axis: Axis;
}): (action: EditorAction) => void {
  return useCallback(
    (action: EditorAction) => {
      const { selectedIds, lastSelectedId } = state.context;
      if (selectedIds.size === 0 || !lastSelectedId) return;

      const type = findById(data, lastSelectedId)?.type ?? "element";
      const labels = MOVE_LABELS[axis];

      switch (action.tag) {
        case "insert":
          send({ type: "OPEN_INSERT" });
          break;
        case "edit":
          send({ type: "OPEN_POPOVER" });
          break;
        case "move-up":
        case "move-down": {
          if (selectedIds.size > 1) return;
          const parent = findParent(data, lastSelectedId);
          if (!parent) return;
          const direction = action.tag === "move-up" ? -1 : 1;
          const label = action.tag === "move-up" ? labels.prev : labels.next;
          move(
            data,
            lastSelectedId,
            parent.parentId,
            parent.slotKey,
            parent.index + direction,
          ).map((next) =>
            animatedUpdate(
              (d) =>
                push(d, `Moved ${type} ${label}`, `move:${lastSelectedId}`),
              next,
            ),
          );
          break;
        }
        case "delete": {
          const ids = [...selectedIds];
          const parentBefore = findParent(data, lastSelectedId);
          removeMany(data, ids).map((next) => {
            if (ids.length > 1) {
              push(next, `Deleted ${ids.length} elements`);
              send({ type: "DESELECT" });
            } else {
              push(next, `Deleted ${type}`);
              const target = nearestSibling(
                data,
                parentBefore?.parentId ?? null,
                parentBefore?.slotKey ?? null,
                lastSelectedId,
              );
              target
                ? send({ type: "SELECT", elementId: target })
                : send({ type: "DESELECT" });
            }
          });
          break;
        }
      }
    },
    [
      data,
      state.context.selectedIds,
      state.context.lastSelectedId,
      push,
      send,
      axis,
    ],
  );
}
