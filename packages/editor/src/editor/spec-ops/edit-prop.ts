import type { Spec, UIElement } from "@json-render/core";
import { err, ok, type Result } from "neverthrow";
import { type SpecOpsError, getElement, cloneAndMutate } from "./helpers.js";

const checkProp = (
  el: UIElement,
  elementId: string,
  propKey: string,
): Result<UIElement, SpecOpsError> =>
  propKey in el.props
    ? ok(el)
    : err({ tag: "prop-not-found", elementId, propKey });

export function editProp(
  spec: Spec,
  elementId: string,
  propKey: string,
  newValue: unknown,
): Result<Spec, SpecOpsError> {
  return getElement(spec, elementId)
    .andThen((el) => checkProp(el, elementId, propKey))
    .map(() =>
      cloneAndMutate(spec, (draft) => {
        draft.elements[elementId].props[propKey] = newValue;
      }),
    );
}
