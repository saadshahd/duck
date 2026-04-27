import type { Data } from "@puckeditor/core";
import { preOrder } from "./pre-order.js";

export type AncestryEntry = {
  readonly id: string;
  readonly slotKey: string | null;
  readonly index: number;
};

export type ParentMapEntry = {
  readonly parentId: string | null;
} & AncestryEntry;

export type ParentMap = Map<string, ParentMapEntry>;

/** Map every component id to its parent location (parentId, slotKey, index).
 *  Top-level components map to `{ parentId: null, slotKey: null, index }`.
 *  Build once, query many. */
export const buildParentMap = (data: Data): ParentMap => {
  const map: ParentMap = new Map();
  for (const { component, path } of preOrder(data)) {
    const last = path[path.length - 1];
    map.set(component.props.id as string, {
      id: component.props.id as string,
      parentId: last.parentId,
      slotKey: last.slotKey,
      index: last.index,
    });
  }
  return map;
};

/** Ancestry chain ordered oldest-first (top-level → direct parent).
 *  Excludes the component itself. Empty if the component is top-level or unknown. */
export const getAncestry = (
  parentMap: ParentMap,
  id: string,
): AncestryEntry[] => {
  const chain: AncestryEntry[] = [];
  let current = parentMap.get(id)?.parentId;
  while (current) {
    const entry = parentMap.get(current);
    if (!entry) break;
    chain.unshift({ id: entry.id, slotKey: entry.slotKey, index: entry.index });
    current = entry.parentId;
  }
  return chain;
};
