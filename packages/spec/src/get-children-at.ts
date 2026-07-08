import type { ComponentData, Data } from "@puckeditor/core";
import type { ParentSite } from "./path.js";
import { findById } from "./find-by-id.js";
import { slotKeysOf } from "./slot-keys-of.js";

/** Children at a site. Root → `data.content`.
 *  Returns null when the parent is unknown, or the slot isn't a slot field. */
export const getChildrenAt = (
  data: Data,
  site: ParentSite,
): readonly ComponentData[] | null => {
  if (site.at === "root") return data.content;
  const parent = findById(data, site.parentId);
  if (parent === null) return null;
  if (!slotKeysOf(parent).includes(site.slotKey)) return null;
  return parent.props[site.slotKey] as ComponentData[];
};
