import type { Spec } from "@json-render/core";

export type AncestryEntry = { readonly id: string; readonly type: string };

/** Map from child ID → parent ID. Built once, O(1) lookups. */
export const buildParentMap = (spec: Spec): Map<string, string> =>
  new Map(
    Object.entries(spec.elements).flatMap(([id, el]) =>
      (el.children ?? []).map((childId) => [childId, id] as const),
    ),
  );

/** Ancestry chain from root to parent (excludes the element itself). */
export const getAncestry = (
  spec: Spec,
  parentMap: Map<string, string>,
  elementId: string,
): AncestryEntry[] => {
  const result: AncestryEntry[] = [];
  let current = parentMap.get(elementId);
  while (current) {
    result.unshift({ id: current, type: spec.elements[current].type });
    current = parentMap.get(current);
  }
  return result;
};
