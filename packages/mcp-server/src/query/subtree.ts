import type { Data } from "@puckeditor/core";
import { Effect } from "effect";
import {
  buildParentMap,
  findById,
  getAncestry,
} from "@json-render-editor/spec";
import { QueryError } from "../errors.js";

export const subtree = (data: Data, id: string) => {
  const node = findById(data, id);
  if (!node)
    return Effect.fail(
      new QueryError({ message: `Element '${id}' not found` }),
    );
  const parentMap = buildParentMap(data);
  return Effect.succeed({
    component: node,
    ancestry: getAncestry(parentMap, id),
  });
};
