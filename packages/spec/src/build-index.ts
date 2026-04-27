import type { ComponentData, Data } from "@puckeditor/core";
import type { Path } from "./path.js";
import { preOrder } from "./pre-order.js";

type IndexEntry = { readonly component: ComponentData; readonly path: Path };

/** Walk once, return id → location index. Last write wins on duplicate ids. */
export const buildIndex = (data: Data): Map<string, IndexEntry> => {
  const index = new Map<string, IndexEntry>();
  for (const { component, path } of preOrder(data)) {
    index.set(component.props.id as string, { component, path });
  }
  return index;
};
