import type { Config, Data } from "@puckeditor/core";
import {
  allowedTypes,
  findById,
  findParent,
  slotPathsOf,
  type SlotPath,
} from "@duckeditor/spec";
import type { InsertTarget } from "./use-insert.js";

/** Where an insert action goes, resolved purely from the selection. No silent
 *  slot defaulting: a node that owns slots always routes to a slot-choice step
 *  (even a single-slot node, so the destination slot is named on screen before
 *  any write). Slots are addressed by prop-path, so array-item slots
 *  (`items[i].content`) are offered alongside top-level ones. Leaves insert as
 *  a next sibling; an empty selection appends at the document root. */
type InsertRoute =
  | { kind: "root" }
  | { kind: "slot-choice"; parentId: string; paths: readonly SlotPath[] }
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

  const paths = slotPathsOf(selected);
  if (paths.length > 0)
    return { kind: "slot-choice", parentId: selectedId, paths };

  const parent = findParent(data, selectedId);
  if (!parent) return { kind: "root" };
  return {
    kind: "sibling",
    target: { ...parent, index: parent.index + 1 },
  };
};

/** The concrete write target for a route that names no slot to choose: a root
 *  append or the resolved next-sibling target. Total over `DirectRoute` — there
 *  is no impossible case to silently misdirect. */
export const directTarget = (route: DirectRoute): InsertTarget =>
  route.kind === "sibling" ? route.target : { at: "root" };

/** The set of component types permitted at `target`, read off the Puck-native
 *  `SlotField.allow`/`disallow` via the shared `allowedTypes` predicate.
 *  Undefined when the target names no slot (root append) or the parent can't
 *  be resolved — the picker then offers every catalog type unfiltered. */
export const allowedTypesForTarget = (
  data: Data,
  config: Config,
  target: InsertTarget,
): ReadonlySet<string> | undefined => {
  if (target.at !== "slot") return undefined;
  const parentType = findById(data, target.parentId)?.type;
  return parentType ? allowedTypes(config, parentType, target.path) : undefined;
};
