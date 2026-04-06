import type { Spec } from "@json-render/core";
import { err, ok, type Result } from "neverthrow";
import { collectDescendants } from "@json-render-editor/spec";
import { type SpecOpsError, cloneAndMutate } from "./helpers.js";
import { findParent } from "./reorder.js";

export type DeleteResult = { spec: Spec; parentId: string };

export function deleteElement(
  spec: Spec,
  elementId: string,
): Result<DeleteResult, SpecOpsError> {
  if (elementId === spec.root)
    return err({ tag: "cannot-delete-root", elementId });

  return findParent(spec, elementId).map(({ parentId, childIndex }) => {
    const descendants = collectDescendants(spec, elementId);
    return {
      spec: cloneAndMutate(spec, (draft) => {
        draft.elements[parentId].children!.splice(childIndex, 1);
        delete draft.elements[elementId];
        for (const id of descendants) delete draft.elements[id];
      }),
      parentId,
    };
  });
}

export type DeleteManyResult = {
  spec: Spec;
  affectedParentIds: ReadonlySet<string>;
};

export function deleteElements(
  spec: Spec,
  elementIds: ReadonlySet<string>,
): Result<DeleteManyResult, SpecOpsError> {
  if (elementIds.has(spec.root))
    return err({ tag: "cannot-delete-root", elementId: spec.root });

  let current = spec;
  const parentIds = new Set<string>();

  for (const id of elementIds) {
    if (!current.elements[id]) continue;
    deleteElement(current, id).map(({ spec: next, parentId }) => {
      current = next;
      parentIds.add(parentId);
    });
  }

  return current === spec
    ? err({ tag: "element-not-found", elementId: "" })
    : ok({ spec: current, affectedParentIds: parentIds });
}
