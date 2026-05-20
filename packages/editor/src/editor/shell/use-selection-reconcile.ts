import { useEffect } from "react";
import type { SelectionState } from "../machine/selection-model.js";
import { Selection } from "../machine/selection-model.js";
import type { EditorEvent } from "../machine/index.js";

export function useSelectionReconcile(
  selection: SelectionState,
  elementIds: ReadonlySet<string>,
  send: (event: EditorEvent) => void,
): void {
  useEffect(() => {
    const event = Selection.reconcile(selection, elementIds);
    if (event) send(event);
  }, [elementIds, selection, send]);
}
