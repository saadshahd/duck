import type { Data } from "@puckeditor/core";
import { getChildrenAt } from "./get-children-at.js";

/** Nearest sibling of `childId` at `(parentId, slotKey)`, or parent, or null.
 *  Priority: previous sibling → next sibling → parent → null.
 *  Returns null only when `childId` is the sole root-level element. */
export const nearestSibling = (
  data: Data,
  parentId: string | null,
  slotKey: string | null,
  childId: string,
): string | null => {
  const siblings = getChildrenAt(data, parentId, slotKey);
  if (!siblings) return parentId;
  const idx = siblings.findIndex((s) => (s.props.id as string) === childId);
  const prev = siblings[idx - 1];
  const next = siblings[idx + 1];
  return (prev?.props.id ?? next?.props.id ?? parentId) as string | null;
};
