import type { Spec } from "@json-render/core";
import { Effect } from "effect";
import {
  buildParentMap,
  foldTree,
  getAncestry,
} from "@json-render-editor/spec";
import { QueryError } from "../errors.js";

type SubtreeNode = {
  readonly id: string;
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly children: SubtreeNode[];
};

export const subtree = (spec: Spec, elementId: string) => {
  if (!spec.elements[elementId])
    return Effect.fail(
      new QueryError({
        message: `Element '${elementId}' not found`,
        context: { availableIds: Object.keys(spec.elements) },
      }),
    );
  const parentMap = buildParentMap(spec);
  const tree = foldTree<SubtreeNode>(spec, elementId, (id, el, children) => ({
    id,
    type: el.type,
    props: el.props as Record<string, unknown>,
    children,
  }));
  return Effect.succeed({
    ...tree,
    ancestry: getAncestry(spec, parentMap, elementId),
  });
};
