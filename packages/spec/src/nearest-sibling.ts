import type { Data } from "@puckeditor/core";
import type { ParentSite } from "./path.js";
import { getChildrenAt } from "./get-children-at.js";

/** Nearest sibling of `childId` at `site`, or the parent, or null.
 *  Priority: previous sibling → next sibling → parent → null.
 *  Returns null only when `childId` is the sole root-level element. */
export const nearestSibling = (
  data: Data,
  site: ParentSite,
  childId: string,
): string | null => {
  const parentId = site.at === "slot" ? site.parentId : null;
  const siblings = getChildrenAt(data, site);
  if (!siblings) return parentId;
  const idx = siblings.findIndex((s) => (s.props.id as string) === childId);
  const prev = siblings[idx - 1];
  const next = siblings[idx + 1];
  return (prev?.props.id ?? next?.props.id ?? parentId) as string | null;
};
