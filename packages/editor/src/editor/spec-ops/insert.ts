import type { Spec, UIElement } from "@json-render/core";
import { err, ok, type Result } from "neverthrow";
import { type SpecOpsError, getElement, cloneAndMutate } from "./helpers.js";
import { findParent } from "./reorder.js";

export type InsertPosition = { tag: "child" } | { tag: "after" };

export type InsertResult = { spec: Spec; elementId: string };

const nextId = (type: string, existing: ReadonlySet<string>): string => {
  const prefix = type.toLowerCase();
  let n = 1;
  while (existing.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
};

export function insertElement(
  spec: Spec,
  targetId: string,
  position: InsertPosition,
  componentType: string,
  defaultProps: Record<string, unknown> = {},
): Result<InsertResult, SpecOpsError> {
  const elementId = nextId(componentType, new Set(Object.keys(spec.elements)));

  const element: UIElement = {
    type: componentType,
    props: { ...defaultProps },
  };

  if (position.tag === "child") {
    return getElement(spec, targetId)
      .andThen((parent) =>
        parent.children
          ? ok(targetId)
          : err({ tag: "no-children" as const, parentId: targetId }),
      )
      .map((parentId) => ({
        spec: cloneAndMutate(spec, (draft) => {
          draft.elements[elementId] = element;
          draft.elements[parentId].children!.push(elementId);
        }),
        elementId,
      }));
  }

  return findParent(spec, targetId).map(({ parentId, childIndex }) => ({
    spec: cloneAndMutate(spec, (draft) => {
      draft.elements[elementId] = element;
      draft.elements[parentId].children!.splice(childIndex + 1, 0, elementId);
    }),
    elementId,
  }));
}
