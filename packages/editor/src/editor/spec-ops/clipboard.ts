import type { Spec, UIElement } from "@json-render/core";
import { err, ok, type Result } from "neverthrow";
import {
  type SpecOpsError,
  getElement,
  collectDescendants,
  cloneAndMutate,
} from "./helpers.js";
import { findParent } from "./reorder.js";

// --- Types ---

export type SpecFragment = {
  _type: "json-render-fragment";
  root: string;
  elements: Record<string, UIElement>;
};

export type DuplicateResult = { spec: Spec; newRootId: string };

// --- Operations ---

export function serializeFragment(
  spec: Spec,
  elementId: string,
): Result<SpecFragment, SpecOpsError> {
  return getElement(spec, elementId).map(() => {
    const ids = [elementId, ...collectDescendants(spec, elementId)];
    return {
      _type: "json-render-fragment" as const,
      root: elementId,
      elements: Object.fromEntries(ids.map((id) => [id, spec.elements[id]])),
    };
  });
}

export function deserializeFragment(
  fragment: SpecFragment,
  existingIds: ReadonlySet<string>,
): SpecFragment {
  const taken = new Set(existingIds);

  const nextId = (type: string): string => {
    const prefix = type.toLowerCase();
    let n = 1;
    while (taken.has(`${prefix}-${n}`)) n++;
    const id = `${prefix}-${n}`;
    taken.add(id);
    return id;
  };

  const idMap = new Map(
    Object.entries(fragment.elements).map(([oldId, el]) => [
      oldId,
      nextId(el.type),
    ]),
  );
  const remap = (id: string) => idMap.get(id)!;

  return {
    _type: "json-render-fragment",
    root: remap(fragment.root),
    elements: Object.fromEntries(
      Object.entries(fragment.elements).map(([oldId, el]) => [
        remap(oldId),
        {
          ...el,
          ...(el.children && { children: el.children.map(remap) }),
        },
      ]),
    ),
  };
}

export function insertFragment(
  spec: Spec,
  fragment: SpecFragment,
  afterElementId: string,
): Result<Spec, SpecOpsError> {
  return findParent(spec, afterElementId).map(({ parentId, childIndex }) =>
    cloneAndMutate(spec, (draft) => {
      Object.assign(draft.elements, fragment.elements);
      draft.elements[parentId].children!.splice(
        childIndex + 1,
        0,
        fragment.root,
      );
    }),
  );
}

export function duplicate(
  spec: Spec,
  elementId: string,
): Result<DuplicateResult, SpecOpsError> {
  if (elementId === spec.root)
    return err({ tag: "cannot-duplicate-root", elementId });

  return serializeFragment(spec, elementId)
    .map((fragment) =>
      deserializeFragment(fragment, new Set(Object.keys(spec.elements))),
    )
    .andThen((remapped) =>
      insertFragment(spec, remapped, elementId).map((newSpec) => ({
        spec: newSpec,
        newRootId: remapped.root,
      })),
    );
}
