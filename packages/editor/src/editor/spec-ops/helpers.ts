import type { Spec, UIElement } from "@json-render/core";
import { err, ok, type Result } from "neverthrow";

// --- Error types ---

export type SpecOpsError =
  | { tag: "element-not-found"; elementId: string }
  | { tag: "parent-not-found"; childId: string }
  | { tag: "index-out-of-bounds"; index: number; length: number }
  | { tag: "no-children"; parentId: string }
  | { tag: "same-index"; index: number }
  | { tag: "same-position"; parentId: string; index: number }
  | { tag: "circular-move"; elementId: string; targetParentId: string }
  | { tag: "cannot-delete-root"; elementId: string }
  | { tag: "cannot-duplicate-root"; elementId: string };

// --- Spec accessors ---

export const getElement = (
  spec: Spec,
  id: string,
): Result<UIElement, SpecOpsError> =>
  spec.elements[id]
    ? ok(spec.elements[id])
    : err({ tag: "element-not-found", elementId: id });

export const getChildren = (
  spec: Spec,
  parentId: string,
): Result<string[], SpecOpsError> =>
  getElement(spec, parentId).andThen((el) =>
    el.children?.length
      ? ok(el.children)
      : err({ tag: "no-children" as const, parentId }),
  );

export const checkBounds = (
  index: number,
  length: number,
): Result<number, SpecOpsError> =>
  index >= 0 && index < length
    ? ok(index)
    : err({ tag: "index-out-of-bounds", index, length });

/** Like checkBounds but allows index === length (for insert-at-end). */
export const checkBoundsInclusive = (
  index: number,
  length: number,
): Result<number, SpecOpsError> =>
  index >= 0 && index <= length
    ? ok(index)
    : err({ tag: "index-out-of-bounds", index, length });

/** Collects all IDs in the subtree rooted at `ancestorId` (exclusive of ancestor).
 *  Precompute once at drag-start, then use `set.has(id)` for O(1) canDrop checks. */
export const collectDescendants = (
  spec: Spec,
  ancestorId: string,
): ReadonlySet<string> => {
  const result = new Set<string>();
  const stack: string[] = [];
  const root = spec.elements[ancestorId]?.children;
  if (root) for (let i = 0; i < root.length; i++) stack.push(root[i]);
  while (stack.length > 0) {
    const id = stack.pop()!;
    result.add(id);
    const children = spec.elements[id]?.children;
    if (children)
      for (let i = 0; i < children.length; i++) stack.push(children[i]);
  }
  return result;
};

// --- Immutable mutation ---

export const cloneAndMutate = (spec: Spec, mutate: (draft: Spec) => void) => {
  const next = structuredClone(spec);
  mutate(next);
  return next;
};

// --- Array operations ---

/** Nearest sibling of a child, or parentId if no siblings remain.
 *  Priority: next sibling → previous sibling → parent. */
export const nearestSibling = (
  spec: Spec,
  parentId: string,
  childId: string,
): string => {
  const siblings = spec.elements[parentId].children ?? [];
  const idx = siblings.indexOf(childId);
  return siblings[idx + 1] ?? siblings[idx - 1] ?? parentId;
};

export const moveInArray = <T>(arr: T[], from: number, to: number): T[] => {
  const result = [...arr];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
};

/** Filters `ids` to elements whose ancestors are NOT also in `ids`,
 *  returned in DFS pre-order (tree reading order).
 *  When a selected element is found, its subtree is skipped — descendants are already covered. */
export const topologicalRoots = (
  spec: Spec,
  ids: ReadonlySet<string>,
): string[] => {
  const roots: string[] = [];
  const walk = (id: string): void => {
    if (ids.has(id)) {
      roots.push(id);
      return; // skip subtree — descendants are covered
    }
    spec.elements[id]?.children?.forEach(walk);
  };
  walk(spec.root);
  return roots;
};
