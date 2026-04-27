import type { ComponentData, Data } from "@puckeditor/core";
import { Effect } from "effect";
import {
  buildParentMap,
  findById,
  getAncestry,
  slotKeysOf,
} from "@json-render-editor/spec";
import { QueryError } from "../errors.js";

const splitProps = (
  component: ComponentData,
): { props: Record<string, unknown>; slots: Record<string, number> } => {
  const slotKeys = new Set(slotKeysOf(component));
  const props: Record<string, unknown> = {};
  const slots: Record<string, number> = {};
  for (const [key, value] of Object.entries(component.props ?? {})) {
    if (slotKeys.has(key) && Array.isArray(value)) {
      slots[key] = value.length;
    } else {
      props[key] = value;
    }
  }
  return { props, slots };
};

export const element = (data: Data, id: string) => {
  const node = findById(data, id);
  if (!node)
    return Effect.fail(
      new QueryError({ message: `Element '${id}' not found` }),
    );
  const parentMap = buildParentMap(data);
  const { props, slots } = splitProps(node);
  return Effect.succeed({
    id,
    type: node.type,
    props,
    slots,
    ancestry: getAncestry(parentMap, id),
  });
};
