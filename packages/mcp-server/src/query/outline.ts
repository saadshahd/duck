import type { Spec } from "@json-render/core";
import { Effect } from "effect";
import { outlineTree } from "@json-render-editor/spec";

export const outline = (spec: Spec, maxDepth = 2) =>
  Effect.succeed({
    outline: outlineTree(spec, maxDepth),
    totalElements: Object.keys(spec.elements).length,
  });
