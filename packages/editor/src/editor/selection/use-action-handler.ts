import { useCallback } from "react";
import type { Spec } from "@json-render/core";
import type { EditorEvent, EditorSnapshot } from "../machine/index.js";
import { findParent, reorderChild, deleteElement } from "../spec-ops/index.js";
import { animatedUpdate } from "../animated-update.js";
import type { EditorAction } from "./action-bar.js";

export function useActionHandler({
  spec,
  state,
  send,
  onSpecChange,
}: {
  spec: Spec;
  state: EditorSnapshot;
  send: (event: EditorEvent) => void;
  onSpecChange?: (spec: Spec) => void;
}): (action: EditorAction) => void {
  return useCallback(
    (action: EditorAction) => {
      const id = state.context.selectedId;
      if (!id || !onSpecChange) return;

      switch (action.tag) {
        case "edit":
          send({ type: "OPEN_POPOVER" });
          break;
        case "move-up":
          findParent(spec, id)
            .andThen(({ parentId, childIndex }) =>
              reorderChild(spec, parentId, childIndex, childIndex - 1),
            )
            .map((next) => animatedUpdate(onSpecChange, next));
          break;
        case "move-down":
          findParent(spec, id)
            .andThen(({ parentId, childIndex }) =>
              reorderChild(spec, parentId, childIndex, childIndex + 1),
            )
            .map((next) => animatedUpdate(onSpecChange, next));
          break;
        case "delete":
          deleteElement(spec, id).map((next) => {
            onSpecChange(next);
            send({ type: "DESELECT" });
          });
          break;
      }
    },
    [spec, state.context.selectedId, onSpecChange, send],
  );
}
