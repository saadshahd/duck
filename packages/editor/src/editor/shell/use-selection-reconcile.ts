import { useEffect } from "react";
import type { EditorEvent } from "../machine/index.js";
import type { Target } from "../machine/index.js";

/** When the document tree changes, drop selections that point at a node which
 *  no longer exists. Element selections are checked directly; slot selections
 *  are valid as long as the parent still exists. */
export function useSelectionReconcile(
  selection: Target | null,
  elementIds: ReadonlySet<string>,
  send: (event: EditorEvent) => void,
): void {
  useEffect(() => {
    if (!selection) return;
    const anchor =
      selection.kind === "element" ? selection.elementId : selection.parentId;
    if (!elementIds.has(anchor)) send({ type: "DESELECT" });
  }, [elementIds, selection, send]);
}
