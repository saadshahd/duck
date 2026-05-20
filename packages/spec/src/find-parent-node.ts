import type { ComponentData, Data } from "@puckeditor/core";
import { findById } from "./find-by-id.js";
import { findParent } from "./find-parent.js";

export const findParentNode = (
  data: Data,
  id: string,
): ComponentData | null => {
  const parent = findParent(data, id);
  return parent?.parentId ? findById(data, parent.parentId) : null;
};
