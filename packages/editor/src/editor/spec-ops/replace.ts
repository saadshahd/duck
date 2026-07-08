import type { ComponentData, Data } from "@puckeditor/core";
import { ok, err, type Result } from "neverthrow";
import { writableChildrenAt } from "@duckeditor/spec";
import { type SpecOpsError, cloneAndMutate, findParent } from "./helpers.js";

/** Replace the entire ComponentData subtree at `id` with `replacement`.
 *  The replacement must carry the same `id` as the element being replaced.
 *  Errors: `element-not-found`. */
export const replace = (
  data: Data,
  id: string,
  replacement: ComponentData,
): Result<Data, SpecOpsError> => {
  const location = findParent(data, id);
  if (location === null) return err({ tag: "element-not-found", id });

  return ok(
    cloneAndMutate(data, (draft) => {
      const siblings = writableChildrenAt(draft, location);
      if (!siblings) return;
      siblings[location.index] = replacement;
    }),
  );
};
