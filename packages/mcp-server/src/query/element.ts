import type { Spec } from "@json-render/core";
import { Effect } from "effect";
import { buildParentMap, getAncestry } from "@json-render-editor/spec";
import { QueryError } from "../errors.js";

export const element = (spec: Spec, elementId: string) => {
  const el = spec.elements[elementId];
  if (!el)
    return Effect.fail(
      new QueryError({
        message: `Element '${elementId}' not found`,
        context: { availableIds: Object.keys(spec.elements) },
      }),
    );
  const parentMap = buildParentMap(spec);
  return Effect.succeed({
    id: elementId,
    type: el.type,
    props: el.props,
    children: el.children ?? [],
    ancestry: getAncestry(spec, parentMap, elementId),
  });
};
