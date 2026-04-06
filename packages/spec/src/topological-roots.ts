import type { Spec } from "@json-render/core";

/** Filter `ids` to elements whose ancestors are NOT also in `ids`,
 *  returned in DFS pre-order. Subtrees of selected elements are skipped. */
export const topologicalRoots = (
  spec: Spec,
  ids: ReadonlySet<string>,
): string[] => {
  const roots: string[] = [];
  const walk = (id: string): void => {
    if (ids.has(id)) {
      roots.push(id);
      return;
    }
    spec.elements[id]?.children?.forEach(walk);
  };
  walk(spec.root);
  return roots;
};
