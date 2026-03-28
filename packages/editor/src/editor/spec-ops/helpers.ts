import type { Spec, UIElement } from "@json-render/core";
import { err, ok, type Result } from "neverthrow";

// --- Error types ---

export type SpecOpsError =
  | { tag: "element-not-found"; elementId: string }
  | { tag: "parent-not-found"; childId: string }
  | { tag: "index-out-of-bounds"; index: number; length: number }
  | { tag: "no-children"; parentId: string }
  | { tag: "same-index"; index: number }
  | { tag: "prop-not-found"; elementId: string; propKey: string };

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

// --- Immutable mutation ---

export const cloneAndMutate = (spec: Spec, mutate: (draft: Spec) => void) => {
  const next = structuredClone(spec);
  mutate(next);
  return next;
};

// --- Array operations ---

export const moveInArray = <T>(arr: T[], from: number, to: number): T[] => {
  const result = [...arr];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
};
