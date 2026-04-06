import type { Spec } from "@json-render/core";

export type ParentInfo = {
  readonly parentId: string;
  readonly childIndex: number;
};

/** Find the parent of `childId` by scanning all elements. Returns null if not found. */
export const findParent = (spec: Spec, childId: string): ParentInfo | null => {
  for (const [id, el] of Object.entries(spec.elements)) {
    const idx = el.children?.indexOf(childId) ?? -1;
    if (idx !== -1) return { parentId: id, childIndex: idx };
  }
  return null;
};
