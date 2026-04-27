import type { ComponentData, Data } from "@puckeditor/core";
import { preOrder } from "./pre-order.js";

/** Find a component by id. Returns null if not present anywhere in tree. */
export const findById = (data: Data, id: string): ComponentData | null => {
  for (const { component } of preOrder(data)) {
    if (component.props.id === id) return component;
  }
  return null;
};
