import type { Data } from "@puckeditor/core";
import type { PathStep } from "./path.js";
import { preOrder } from "./pre-order.js";

/** Locate `childId` in the tree. Returns the last step of its path
 *  (site + index), or null if not found.
 *  Top-level children get `{ at: "root", index }`. */
export const findParent = (data: Data, childId: string): PathStep | null => {
  for (const { component, path } of preOrder(data)) {
    if (component.props.id === childId) return path[path.length - 1];
  }
  return null;
};
