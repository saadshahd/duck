import type { Spec } from "@json-render/core";

/** All descendant IDs below `ancestorId` (exclusive of ancestor). */
export const collectDescendants = (
  spec: Spec,
  ancestorId: string,
): ReadonlySet<string> => {
  const result = new Set<string>();
  const stack = [...(spec.elements[ancestorId]?.children ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    result.add(id);
    const children = spec.elements[id]?.children;
    if (children) stack.push(...children);
  }
  return result;
};
