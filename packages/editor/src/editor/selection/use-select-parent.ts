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
    if (pointer === "slot-selected" && selectedSlot)
      return send({ type: "SELECT", elementId: selectedSlot.parentId });
    const parent = findParent(data, lastSelectedId);
    if (parent && parent.parentId !== null && parent.slotKey !== null)
      return send({
        type: "SELECT_SLOT",
        parentId: parent.parentId,
        slotKey: parent.slotKey,
      });
    send({ type: "DESELECT" });
  };
}
