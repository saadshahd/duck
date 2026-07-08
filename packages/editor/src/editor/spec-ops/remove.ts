import type { Data } from "@puckeditor/core";
import { err, ok, type Result } from "neverthrow";
import {
  type SpecOpsError,
  cloneAndMutate,
  findParent,
  writableChildrenAt,
} from "./helpers.js";

/** Remove the subtree rooted at `id`. Errors: `element-not-found`. */
export const remove = (data: Data, id: string): Result<Data, SpecOpsError> => {
  const location = findParent(data, id);
  if (!location) return err({ tag: "element-not-found", id });

  return ok(
    cloneAndMutate(data, (draft) => {
      const siblings = writableChildrenAt(draft, location);
      if (!siblings) return;
      siblings.splice(location.index, 1);
    }),
  );
};

export const removeMany = (
  data: Data,
  ids: readonly string[],
): Result<Data, SpecOpsError> =>
  ids.reduce<Result<Data, SpecOpsError>>(
    (result, id) => result.andThen((next) => remove(next, id)),
    ok(data),
  );
