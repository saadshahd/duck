import type { Spec } from "@json-render/core";

export type NavDirection = "forward" | "backward";

export type NavTarget =
  | { tag: "select"; targetId: string }
  | { tag: "deselect" };

/**
 * Next/previous element in depth-first pre-order.
 * Returns deselect at document boundaries or for unknown elements.
 */
export function nextInTreeOrder(
  spec: Spec,
  selectedId: string,
  direction: NavDirection,
): NavTarget {
  const order = preOrder(spec);
  const idx = order.indexOf(selectedId);
  if (idx === -1) return { tag: "deselect" };

  const nextIdx = direction === "forward" ? idx + 1 : idx - 1;
  if (nextIdx < 0 || nextIdx >= order.length) return { tag: "deselect" };
  return { tag: "select", targetId: order[nextIdx] };
}

/** Depth-first pre-order walk of the spec tree. */
const preOrder = (spec: Spec): string[] => {
  const visit = (id: string): string[] => [
    id,
    ...(spec.elements[id]?.children ?? []).flatMap(visit),
  ];
  return visit(spec.root);
};
