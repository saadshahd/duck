import type { Data } from "@puckeditor/core";
import { preOrder } from "./pre-order.js";

export type ParentInfo = {
  readonly parentId: string | null;
  readonly slotKey: string | null;
  readonly index: number;
};

/** Locate `childId` in the tree. Returns the last step of its path
 *  (parent + slot + index), or null if not found.
 *  Top-level children get `{ parentId: null, slotKey: null, index }`. */
export const findParent = (data: Data, childId: string): ParentInfo | null => {
  for (const { component, path } of preOrder(data)) {
    if (component.props.id === childId) return path[path.length - 1];
  }
  return null;
};
