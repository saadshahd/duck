import type { Spec } from "@json-render/core";

/** Depth-first pre-order walk of the spec tree. */
export const preOrder = (spec: Spec): string[] => {
  const visit = (id: string): string[] => [
    id,
    ...(spec.elements[id]?.children ?? []).flatMap(visit),
  ];
  return visit(spec.root);
};
