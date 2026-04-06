import type { Spec } from "@json-render/core";

/** Nearest sibling of a child, or parentId if no siblings remain.
 *  Priority: next sibling → previous sibling → parent. */
export const nearestSibling = (
  spec: Spec,
  parentId: string,
  childId: string,
): string => {
  const siblings = spec.elements[parentId].children ?? [];
  const idx = siblings.indexOf(childId);
  return siblings[idx + 1] ?? siblings[idx - 1] ?? parentId;
};
