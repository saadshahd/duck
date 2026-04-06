import type { Spec, UIElement } from "@json-render/core";

/** Bottom-up fold over the spec tree. Children are visited first,
 *  their results passed to the visitor for the parent. */
export const foldTree = <T>(
  spec: Spec,
  id: string,
  visit: (id: string, element: UIElement, children: T[]) => T,
): T => {
  const el = spec.elements[id];
  if (!el) return visit(id, { type: "unknown", props: {} } as UIElement, []);
  const children = (el.children ?? []).map((c) => foldTree(spec, c, visit));
  return visit(id, el, children);
};
