import type { Spec } from "@json-render/core";
import { err, ok, type Result } from "neverthrow";
import {
  type SpecOpsError,
  getChildren,
  checkBounds,
  cloneAndMutate,
  moveInArray,
} from "./helpers.js";

export function findParent(
  spec: Spec,
  childId: string,
): Result<{ parentId: string; childIndex: number }, SpecOpsError> {
  const entry = Object.entries(spec.elements).find(([, el]) =>
    el.children?.includes(childId),
  );
  return entry
    ? ok({
        parentId: entry[0],
        childIndex: entry[1].children!.indexOf(childId),
      })
    : err({ tag: "parent-not-found", childId });
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
