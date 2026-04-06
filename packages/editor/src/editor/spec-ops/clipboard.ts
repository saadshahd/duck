import type { Spec, UIElement } from "@json-render/core";
import { err, ok, type Result } from "neverthrow";
import {
  type SpecOpsError,
  getElement,
  collectDescendants,
  cloneAndMutate,
  topologicalRoots,
} from "./helpers.js";
import { findParent } from "./reorder.js";
import type { InsertPosition } from "./insert.js";

// --- Types ---

export type SpecFragment = {
  _type: "json-render-fragment";
  roots: string[];
  elements: Record<string, UIElement>;
};

export type DuplicateResult = { spec: Spec; newRootIds: string[] };

// --- Operations ---

export function serializeFragment(
  spec: Spec,
  elementIds: ReadonlySet<string>,
): Result<SpecFragment, SpecOpsError> {
  const roots = topologicalRoots(spec, elementIds);
  if (roots.length === 0)
    return err({
      tag: "element-not-found",
      elementId: [...elementIds][0] ?? "",
    });

  const allIds = roots.flatMap((id) => [id, ...collectDescendants(spec, id)]);
  return ok({
    _type: "json-render-fragment" as const,
    roots,
    elements: Object.fromEntries(allIds.map((id) => [id, spec.elements[id]])),
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
    roots: fragment.roots.map(remap),
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

const insertInto = (
  spec: Spec,
  fragment: SpecFragment,
  parentId: string,
): Spec =>
  cloneAndMutate(spec, (draft) => {
    Object.assign(draft.elements, fragment.elements);
    draft.elements[parentId].children!.push(...fragment.roots);
  });

const insertAfter = (
  spec: Spec,
  fragment: SpecFragment,
  parentId: string,
  childIndex: number,
): Spec =>
  cloneAndMutate(spec, (draft) => {
    Object.assign(draft.elements, fragment.elements);
    draft.elements[parentId].children!.splice(
      childIndex + 1,
      0,
      ...fragment.roots,
    );
  });

export function insertFragment(
  spec: Spec,
  fragment: SpecFragment,
  targetId: string,
  position: InsertPosition,
): Result<Spec, SpecOpsError> {
  if (position.tag === "child") {
    return getElement(spec, targetId).andThen((target) =>
      target.children
        ? ok(insertInto(spec, fragment, targetId))
        : err({ tag: "no-children" as const, parentId: targetId }),
    );
  }

  return findParent(spec, targetId).map(({ parentId, childIndex }) =>
    insertAfter(spec, fragment, parentId, childIndex),
  );
}

export function duplicate(
  spec: Spec,
  elementIds: ReadonlySet<string>,
): Result<DuplicateResult, SpecOpsError> {
  const allRoots = topologicalRoots(spec, elementIds);
  if (allRoots.length === 0)
    return err({
      tag: "element-not-found",
      elementId: [...elementIds][0] ?? "",
    });

  const roots = allRoots.filter((id) => id !== spec.root);
  if (roots.length === 0)
    return err({ tag: "cannot-duplicate-root", elementId: spec.root });

  let current = spec;
  const newRootIds: string[] = [];

  // Reverse order: inserting after later siblings first avoids index shifts
  for (let i = roots.length - 1; i >= 0; i--) {
    const id = roots[i];
    const result = serializeFragment(current, new Set([id]))
      .map((frag) =>
        deserializeFragment(frag, new Set(Object.keys(current.elements))),
      )
      .andThen((remapped) =>
        insertFragment(current, remapped, id, { tag: "after" }).map(
          (newSpec) => {
            current = newSpec;
            newRootIds.unshift(remapped.roots[0]);
          },
        ),
      );
    if (result.isErr()) return err(result._unsafeUnwrapErr());
  }

  return ok({ spec: current, newRootIds });
}
