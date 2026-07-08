import type { ComponentData, Data } from "@puckeditor/core";
import { getIn, type ParentSite } from "./path.js";
import { findById } from "./find-by-id.js";
import { isSlotValue } from "./slot-keys-of.js";

/** Children at a site. Root → `data.content`.
 *  Returns null when the parent is unknown, or the path isn't a slot. */
export const getChildrenAt = (
  data: Data,
  site: ParentSite,
): readonly ComponentData[] | null => {
  if (site.at === "root") return data.content;
  const parent = findById(data, site.parentId);
  if (parent === null) return null;
  const value = getIn(parent.props, site.path);
  return isSlotValue(value) ? value : null;
};

/** Resolve a writable children array on a draft for `site`.
 *  Returns null if the parent or slot doesn't exist on the draft. */
export const writableChildrenAt = (
  draft: Data,
  site: ParentSite,
): ComponentData[] | null => {
  if (site.at === "root") return draft.content;
  const parent = findById(draft, site.parentId);
  if (!parent) return null;
  const value = getIn(parent.props, site.path);
  return Array.isArray(value) ? (value as ComponentData[]) : null;
};
