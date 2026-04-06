import type { Spec } from "@json-render/core";
import { Effect } from "effect";
import { buildParentMap, getAncestry } from "@json-render-editor/spec";

export const typeQuery = (spec: Spec, componentType: string) => {
  const parentMap = buildParentMap(spec);
  const elements = Object.entries(spec.elements)
    .filter(([, el]) => el.type === componentType)
    .map(([id, el]) => ({
      id,
      type: el.type,
      props: el.props,
      children: el.children ?? [],
      ancestry: getAncestry(spec, parentMap, id),
    }));
  return Effect.succeed({ elements, count: elements.length });
};
