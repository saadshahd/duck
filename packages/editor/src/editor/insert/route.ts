import type { Data } from "@puckeditor/core";
import { findById, findParent, slotKeysOf } from "@duckeditor/spec";
import type { InsertTarget } from "./use-insert.js";

/** Where an insert action goes, resolved purely from the selection. No silent
 *  slot defaulting: a node that owns slots always routes to a slot-choice step
 *  (even a single-slot node, so the destination slot is named on screen before
 *  any write). Leaves insert as a next sibling; an empty selection appends at
 *  the document root. */
type InsertRoute =
  | { kind: "root" }
  | { kind: "slot-choice"; parentId: string; slotKeys: readonly string[] }
  | { kind: "sibling"; target: InsertTarget };

/** A route that resolves to a concrete write target with no slot to choose. The
 *  `slot-choice` case is excluded by construction, so `directTarget` cannot be
 *  handed a route it would have to silently misdirect to the root. */
export type DirectRoute = Exclude<InsertRoute, { kind: "slot-choice" }>;

export const routeInsert = (
  data: Data,
  selectedId: string | null,
): InsertRoute => {
  if (!selectedId) return { kind: "root" };

  const selected = findById(data, selectedId);
  if (!selected) return { kind: "root" };

  const slotKeys = slotKeysOf(selected);
  if (slotKeys.length > 0)
    return { kind: "slot-choice", parentId: selectedId, slotKeys };

  const parent = findParent(data, selectedId);
  if (!parent) return { kind: "root" };
  return {
    kind: "sibling",
    target: {
      parentId: parent.parentId,
      slotKey: parent.slotKey,
      index: parent.index + 1,
    },
  };
};

/** The concrete write target for a route that names no slot to choose: a root
 *  append or the resolved next-sibling target. Total over `DirectRoute` — there
 *  is no impossible case to silently misdirect. */
export const directTarget = (route: DirectRoute): InsertTarget =>
  route.kind === "sibling" ? route.target : { parentId: null, slotKey: null };
