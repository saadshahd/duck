import type { Spec } from "@json-render/core";

/**
 * IDs of elements likely to be invisible — containers with no children.
 * Heuristic: narrows candidates for a DOM dimension check.
 * Not definitive — a catalog component could render visuals with empty children.
 */
export function ghostCandidateIds(spec: Spec): string[] {
  return Object.entries(spec.elements)
    .filter(([, el]) => el.children?.length === 0)
    .map(([id]) => id);
}
