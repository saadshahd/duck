import type { Spec } from "@json-render/core";
import { err, ok, type Result } from "neverthrow";
import { findParent as findParentPure } from "@json-render-editor/spec";
import { collectDescendants } from "@json-render-editor/spec";
import {
  type SpecOpsError,
  getElement,
  getChildren,
  checkBounds,
  checkBoundsInclusive,
  cloneAndMutate,
  moveInArray,
} from "./helpers.js";

export function findParent(
  spec: Spec,
  childId: string,
): Result<{ parentId: string; childIndex: number }, SpecOpsError> {
  const result = findParentPure(spec, childId);
  return result ? ok(result) : err({ tag: "parent-not-found", childId });
}

export function reorderChild(
  spec: Spec,
  parentId: string,
  fromIndex: number,
  toIndex: number,
): Result<Spec, SpecOpsError> {
  if (fromIndex === toIndex)
    return err({ tag: "same-index", index: fromIndex });

  return getChildren(spec, parentId)
    .andThen((children) =>
      checkBounds(fromIndex, children.length)
        .andThen(() => checkBounds(toIndex, children.length))
        .map(() => children),
    )
    .map(() =>
      cloneAndMutate(spec, (draft) => {
        draft.elements[parentId].children = moveInArray(
          draft.elements[parentId].children!,
          fromIndex,
          toIndex,
        );
      }),
    );
}

/** Move an element from one parent to another (or reorder within same parent). */
export function moveChild(
  spec: Spec,
  sourceParentId: string,
  sourceIndex: number,
  targetParentId: string,
  targetIndex: number,
): Result<Spec, SpecOpsError> {
  if (sourceParentId === targetParentId)
    return reorderChild(spec, sourceParentId, sourceIndex, targetIndex);

  return getChildren(spec, sourceParentId)
    .andThen((srcChildren) =>
      checkBounds(sourceIndex, srcChildren.length).map(
        () => srcChildren[sourceIndex],
      ),
    )
    .andThen((childId): Result<string, SpecOpsError> => {
      if (
        childId === targetParentId ||
        collectDescendants(spec, childId).has(targetParentId)
      )
        return err({
          tag: "circular-move",
          elementId: childId,
          targetParentId,
        });
      return ok(childId);
    })
    .andThen(() =>
      getElement(spec, targetParentId).map((el) => el.children ?? []),
    )
    .andThen((tgtChildren) =>
      checkBoundsInclusive(targetIndex, tgtChildren.length),
    )
    .map(() =>
      cloneAndMutate(spec, (draft) => {
        const [moved] = draft.elements[sourceParentId].children!.splice(
          sourceIndex,
          1,
        );
        const tgt = (draft.elements[targetParentId].children ??= []);
        tgt.splice(targetIndex, 0, moved);
      }),
    );
}
