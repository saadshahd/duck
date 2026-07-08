import type { Config, ComponentData, Data } from "@puckeditor/core";
import { err, ok, type Result } from "neverthrow";
import { slotKeysOf, type ParentSite } from "@duckeditor/spec";
import { add } from "./add.js";
import { type SpecOpsError, cloneData, findById } from "./helpers.js";
import { mintId, takenIds } from "./id.js";

/** Walk `component` (mutating in place) and replace every props.id with a fresh,
 *  globally-unique id. `taken` is updated as ids are minted. */
const regenerateIds = (component: ComponentData, taken: Set<string>): void => {
  const next = mintId(component.type, taken);
  taken.add(next);
  component.props.id = next;
  for (const slotKey of slotKeysOf(component)) {
    const children = component.props[slotKey] as ComponentData[];
    for (const child of children) regenerateIds(child, taken);
  }
};

/** Deep-clone the subtree at `id`. Errors: `element-not-found`. */
export const copy = (
  data: Data,
  id: string,
): Result<ComponentData, SpecOpsError> => {
  const found = findById(data, id);
  if (!found) return err({ tag: "element-not-found", id });
  return ok(cloneData(found));
};

/** Insert `component` (and its full subtree) at `site` after regenerating every
 *  id to avoid collisions. Index defaults to append.
 *  Returns the updated data and the id of the inserted top-level component. */
export const paste = (
  data: Data,
  site: ParentSite,
  component: ComponentData,
  config: Config,
  index?: number,
): Result<{ data: Data; id: string }, SpecOpsError> => {
  const cloned = cloneData(component);
  regenerateIds(cloned, takenIds(data));
  const id = cloned.props.id as string;
  return add(data, { site, component: cloned, index }, config).map((data) => ({
    data,
    id,
  }));
};
