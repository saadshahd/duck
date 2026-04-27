import type { Config, Data } from "@puckeditor/core";
import { err, type Result } from "neverthrow";
import { type SpecOpsError, findById } from "./helpers.js";
import { update } from "./update.js";

/** Immutable set: returns a new value with `path` overwritten. Walks objects
 *  and arrays; creates intermediates as needed (objects when next key is
 *  string, arrays when number). */
const setIn = (
  target: unknown,
  path: readonly (string | number)[],
  value: unknown,
): unknown => {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (typeof head === "number") {
    const arr = Array.isArray(target) ? [...target] : [];
    arr[head] = setIn(arr[head], rest, value);
    return arr;
  }
  const obj =
    target && typeof target === "object" && !Array.isArray(target)
      ? { ...(target as Record<string, unknown>) }
      : {};
  obj[head] = setIn(obj[head], rest, value);
  return obj;
};

/** Update a single nested prop on component `id`. Delegates to `update`, which
 *  reapplies defaults — so caller paths nested inside slot props will lose
 *  unrelated slot content unless they pass via the full props path. */
export const editProp = (
  data: Data,
  id: string,
  propPath: readonly (string | number)[],
  value: unknown,
  config: Config,
): Result<Data, SpecOpsError> => {
  const original = findById(data, id);
  if (!original) return err({ tag: "element-not-found", id });

  const nextProps = setIn(original.props, propPath, value) as Record<
    string,
    unknown
  >;
  return update(data, id, nextProps, config);
};
