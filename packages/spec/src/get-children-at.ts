import type { ComponentData, Data } from "@puckeditor/core";
import { findById } from "./find-by-id.js";
import { slotKeysOf } from "./slot-keys-of.js";

/** Children at a slot location. Top-level is `(null, null)` → `data.content`.
 *  Returns null when parentId is unknown, or parentId is given but slotKey isn't a slot field. */
export const getChildrenAt = (
  data: Data,
  parentId: string | null,
  slotKey: string | null,
): readonly ComponentData[] | null => {
  if (parentId === null && slotKey === null) return data.content;
  if (parentId === null || slotKey === null) return null;
  const parent = findById(data, parentId);
  if (parent === null) return null;
  if (!slotKeysOf(parent).includes(slotKey)) return null;
  return parent.props[slotKey] as ComponentData[];
};
