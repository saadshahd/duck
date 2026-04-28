import type { Data } from "@puckeditor/core";
import { Effect } from "effect";
import {
  buildParentMap,
  getAncestry,
  preOrder,
} from "@duck/spec";

export const typeQuery = (data: Data, componentType: string) => {
  const parentMap = buildParentMap(data);
  const elements: Array<{
    id: string;
    type: string;
    props: Record<string, unknown>;
    ancestry: ReturnType<typeof getAncestry>;
  }> = [];
  for (const { component } of preOrder(data)) {
    if (component.type !== componentType) continue;
    const id = (component.props as { id?: string })?.id ?? "";
    elements.push({
      id,
      type: component.type,
      props: component.props,
      ancestry: getAncestry(parentMap, id),
    });
  }
  return Effect.succeed({ elements, count: elements.length });
};
