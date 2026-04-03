import type { Spec } from "@json-render/core";
import type { Result } from "neverthrow";
import { type SpecOpsError, getElement, cloneAndMutate } from "./helpers.js";

export function editProp(
  spec: Spec,
  elementId: string,
  propKey: string,
  newValue: unknown,
): Result<Spec, SpecOpsError> {
  return getElement(spec, elementId).map(() =>
    cloneAndMutate(spec, (draft) => {
      draft.elements[elementId].props[propKey] = newValue;
    }),
  );
}
