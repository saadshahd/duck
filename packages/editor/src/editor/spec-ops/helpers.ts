import type { ComponentData, Data } from "@puckeditor/core";
import { findById, findParent, slotKeysOf } from "@duckeditor/spec";
import { err, ok, type Result } from "neverthrow";

export { findById, findParent };

// --- Error types ---

export type SpecOpsError =
  | { tag: "element-not-found"; id: string }
  | { tag: "parent-not-found"; parentId: string }
  | { tag: "slot-not-defined"; parentId: string; slotKey: string }
  | { tag: "index-out-of-bounds"; index: number; length: number }
  | { tag: "circular-move"; id: string; toParentId: string }
  | {
      tag: "disallowed-type";
      parentId: string;
      slotKey: string;
      componentType: string;
    };

/** All descendant ids beneath `component` (exclusive of component). */
export const descendantIds = (
  component: ComponentData,
): ReadonlySet<string> => {
  const result = new Set<string>();
  const visit = (node: ComponentData): void => {
    for (const slotKey of slotKeysOf(node)) {
      const children = node.props[slotKey] as ComponentData[];
      for (const child of children) {
        result.add(child.props.id as string);
        visit(child);
      }
    }
  };
  visit(component);
  return result;
};

// --- Bounds checks ---

export const checkBoundsInclusive = (
  index: number,
  length: number,
): Result<number, SpecOpsError> =>
  index >= 0 && index <= length
    ? ok(index)
    : err({ tag: "index-out-of-bounds", index, length });

export const checkBoundsExclusive = (
  index: number,
  length: number,
): Result<number, SpecOpsError> =>
  index >= 0 && index < length
    ? ok(index)
    : err({ tag: "index-out-of-bounds", index, length });

// --- Mutation primitives ---

export const cloneData = <T>(data: T): T => structuredClone(data);

/** Run a mutating function on a deep clone, then return the clone. */
export const cloneAndMutate = (
  data: Data,
  mutate: (draft: Data) => void,
): Data => {
  const next = structuredClone(data);
  mutate(next);
  return next;
};

export const moveInArray = <T>(arr: T[], from: number, to: number): T[] => {
  const result = [...arr];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
};
