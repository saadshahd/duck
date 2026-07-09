import type { Data } from "@puckeditor/core";
import { Effect } from "effect";
import { buildParentMap, getAncestry, preOrder } from "@duckeditor/spec";

export const typeQuery = (data: Data, componentType: string) => {
  const parentMap = buildParentMap(data);
  const elements = [...preOrder(data)]
    .filter(({ component }) => component.type === componentType)
    .map(({ component }) => {
      const id = (component.props as { id?: string })?.id ?? "";
      return {
        id,
        type: component.type,
        props: component.props,
        ancestry: getAncestry(parentMap, id),
      };
    });
  return Effect.succeed({ elements, count: elements.length });
};
