import { useCallback } from "react";
import type { Spec } from "@json-render/core";
import type { EditorEvent, EditorSnapshot } from "../machine/index.js";
import type { Axis } from "../layout/index.js";
import {
  findParent,
  reorderChild,
  deleteElement,
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
      const id = state.context.selectedId;
      if (!id) return;

      const type = spec.elements[id]?.type ?? "element";
      const labels = MOVE_LABELS[axis];

      switch (action.tag) {
        case "insert":
          send({ type: "OPEN_INSERT" });
          break;
        case "edit":
          send({ type: "OPEN_POPOVER" });
          break;
        case "move-up":
          findParent(spec, id)
            .andThen(({ parentId, childIndex }) =>
              reorderChild(spec, parentId, childIndex, childIndex - 1),
            )
            .map((next) =>
              animatedUpdate(
                (s) => push(s, `Moved ${type} ${labels.prev}`, `move:${id}`),
                next,
              ),
            );
          break;
        case "move-down":
          findParent(spec, id)
            .andThen(({ parentId, childIndex }) =>
              reorderChild(spec, parentId, childIndex, childIndex + 1),
            )
            .map((next) =>
              animatedUpdate(
                (s) => push(s, `Moved ${type} ${labels.next}`, `move:${id}`),
                next,
              ),
            );
          break;
        case "delete":
          deleteElement(spec, id).map(({ spec: next, parentId }) => {
            const nextId = nearestSibling(spec, parentId, id);
            push(next, `Deleted ${type}`);
            send({ type: "SELECT", elementId: nextId });
          });
          break;
      }
    },
    [spec, state.context.selectedId, push, send, axis],
  );
}
