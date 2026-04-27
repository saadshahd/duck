import type { ComponentData, Data } from "@puckeditor/core";
import { findById } from "./find-by-id.js";
import { slotKeysOf } from "./slot-keys-of.js";

const descendantsOf = (component: ComponentData): string[] =>
  slotKeysOf(component).flatMap((slotKey) => {
    const children = component.props[slotKey] as ComponentData[];
    return children.flatMap((child) => [
      child.props.id as string,
      ...descendantsOf(child),
    ]);
  });

/** All descendant ids of `id`, excluding `id` itself.
 *  Empty if id has no children or doesn't exist. */
export const collectDescendants = (data: Data, id: string): string[] => {
  const root = findById(data, id);
  return root === null ? [] : descendantsOf(root);
};
