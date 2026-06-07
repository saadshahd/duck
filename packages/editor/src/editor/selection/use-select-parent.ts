import type { Data } from "@puckeditor/core";
import { findParent } from "../spec-ops/index.js";
import type { EditorEvent, SelectedSlot } from "../machine/index.js";

export function createSelectParent(args: {
  data: Data;
  lastSelectedId: string | null;
  pointer: string;
  selectedSlot: SelectedSlot | null;
  send: (event: EditorEvent) => void;
}): (() => void) | undefined {
  const { data, lastSelectedId, pointer, selectedSlot, send } = args;
  if (!lastSelectedId) return undefined;
  return () => {
    // Climb is pure node→node navigation: it never enters slot-selected. From a
    // slot-selected entry (the insert flow's slot-stop label) it climbs to the
    // node owning the slot; otherwise it climbs to the parent node directly.
    if (pointer === "slot-selected" && selectedSlot)
      return send({ type: "SELECT", elementId: selectedSlot.parentId });
    const parent = findParent(data, lastSelectedId);
    if (parent && parent.parentId !== null)
      return send({ type: "SELECT", elementId: parent.parentId });
    send({ type: "DESELECT" });
  };
}
