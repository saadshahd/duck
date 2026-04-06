import type { Spec } from "@json-render/core";
import { Effect } from "effect";
import { buildParentMap, getAncestry } from "@json-render-editor/spec";

export const search = (spec: Spec, query: string) => {
  const lower = query.toLowerCase();
  const parentMap = buildParentMap(spec);
  const results = Object.entries(spec.elements).flatMap(([id, el]) =>
    Object.entries(el.props as Record<string, unknown>)
      .filter(([, v]) => JSON.stringify(v).toLowerCase().includes(lower))
      .map(([propKey, v]) => ({
        id,
        type: el.type,
        propKey,
        matchedValue: JSON.stringify(v),
        ancestry: getAncestry(spec, parentMap, id),
      })),
  );
  return Effect.succeed({ results, count: results.length });
};
