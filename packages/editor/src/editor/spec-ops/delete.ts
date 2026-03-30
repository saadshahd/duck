import type { Spec } from "@json-render/core";
import { err, type Result } from "neverthrow";
import {
  type SpecOpsError,
  collectDescendants,
  cloneAndMutate,
} from "./helpers.js";
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
