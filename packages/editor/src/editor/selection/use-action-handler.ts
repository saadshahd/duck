import { useCallback } from "react";
import type { Spec } from "@json-render/core";
import type { EditorEvent, EditorSnapshot } from "../machine/index.js";
import { findParent, reorderChild, deleteElement } from "../spec-ops/index.js";
import { animatedUpdate } from "../animated-update.js";
import type { SpecPush } from "../types.js";
import type { EditorAction } from "./action-bar.js";

export function useActionHandler({
  spec,
  state,
  send,
  push,
}: {
  spec: Spec;
  state: EditorSnapshot;
  send: (event: EditorEvent) => void;
  push: SpecPush;
}): (action: EditorAction) => void {
  return useCallback(
    (action: EditorAction) => {
      const id = state.context.selectedId;
      if (!id) return;

      const type = spec.elements[id]?.type ?? "element";

      switch (action.tag) {
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
                (s) => push(s, `Moved ${type} up`, `move:${id}`),
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
                (s) => push(s, `Moved ${type} down`, `move:${id}`),
                next,
              ),
            );
          break;
        case "delete":
          deleteElement(spec, id).map((next) => {
            push(next, `Deleted ${type}`);
            send({ type: "DESELECT" });
          });
          break;
      }
    },
    [spec, state.context.selectedId, push, send],
  );
}
