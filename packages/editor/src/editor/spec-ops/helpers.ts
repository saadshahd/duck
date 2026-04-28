import type { ComponentData, Data } from "@puckeditor/core";
import {
  findById,
  findParent,
  getChildrenAt,
  slotKeysOf,
} from "@duck/spec";
import { err, ok, type Result } from "neverthrow";

export { findById, findParent };

// --- Error types ---

export type SpecOpsError =
  | { tag: "element-not-found"; id: string }
  | { tag: "parent-not-found"; parentId: string }
  | { tag: "slot-not-defined"; parentId: string; slotKey: string }
  | { tag: "index-out-of-bounds"; index: number; length: number }
  | { tag: "circular-move"; id: string; toParentId: string };

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

/** All component ids in pre-order (component first, then children). */
export const allIds = (data: Data): readonly string[] => {
  const result: string[] = [];
  const visit = (node: ComponentData): void => {
    result.push(node.props.id as string);
    for (const slotKey of slotKeysOf(node)) {
      const children = node.props[slotKey] as ComponentData[];
      for (const child of children) visit(child);
    }
  };
  for (const top of data.content) visit(top);
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

/** Resolve a writable children array on a draft for `(parentId, slotKey)`.
 *  Returns null if the parent or slot doesn't exist on the draft. */
export const writableChildrenAt = (
  draft: Data,
  parentId: string | null,
  slotKey: string | null,
): ComponentData[] | null => {
  if (parentId === null && slotKey === null) return draft.content;
  if (parentId === null || slotKey === null) return null;
  const parent = findById(draft, parentId);
  if (!parent) return null;
  const slotValue = parent.props[slotKey];
  return Array.isArray(slotValue) ? (slotValue as ComponentData[]) : null;
};

export const moveInArray = <T>(arr: T[], from: number, to: number): T[] => {
  const result = [...arr];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
};
