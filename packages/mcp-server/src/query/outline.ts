import type { Data } from "@puckeditor/core";
import { Effect } from "effect";
import { outlineTree, preOrder } from "@json-render-editor/spec";

const countComponents = (data: Data): number => {
  let n = 0;
  for (const _ of preOrder(data)) n++;
  return n;
};

export const outline = (data: Data, maxDepth = 2) =>
  Effect.succeed({
    outline: outlineTree(data, maxDepth),
    totalComponents: countComponents(data),
  });
