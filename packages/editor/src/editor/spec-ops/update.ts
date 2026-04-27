import type { Config, Data } from "@puckeditor/core";
import { err, ok, type Result } from "neverthrow";
import {
  type SpecOpsError,
  cloneAndMutate,
  findById,
  findParent,
  writableChildrenAt,
} from "./helpers.js";

const defaultsFor = (config: Config, type: string): Record<string, unknown> => {
  const components = (config.components ?? {}) as Record<
    string,
    { defaultProps?: Record<string, unknown> } | undefined
  >;
  return components[type]?.defaultProps ?? {};
};

/** Replace the props of component `id`. Defaults are reapplied; existing props
 *  are NOT preserved unless the caller includes them in `newProps`. The id is
 *  preserved. Errors: `element-not-found`. */
export const update = (
  data: Data,
  id: string,
  newProps: Record<string, unknown>,
  config: Config,
): Result<Data, SpecOpsError> => {
  const original = findById(data, id);
  if (!original) return err({ tag: "element-not-found", id });

  const location = findParent(data, id);
  const defaults = defaultsFor(config, original.type);
  const nextProps = {
    ...defaults,
    ...newProps,
    id: original.props.id,
  };

  return ok(
    cloneAndMutate(data, (draft) => {
      if (location === null) return;
      const siblings = writableChildrenAt(
        draft,
        location.parentId,
        location.slotKey,
      );
      if (!siblings) return;
      const target = siblings[location.index];
      target.props = nextProps;
    }),
  );
};
