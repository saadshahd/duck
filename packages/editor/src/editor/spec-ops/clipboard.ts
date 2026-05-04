import type { Config, ComponentData, Data } from "@puckeditor/core";
import { err, ok, type Result } from "neverthrow";
import { slotKeysOf } from "@duck/spec";
import { add } from "./add.js";
import { type SpecOpsError, cloneData, findById } from "./helpers.js";

const randomSuffix = (): string => Math.random().toString(36).slice(2, 8);

const generateId = (type: string, taken: ReadonlySet<string>): string => {
  const prefix = type.toLowerCase();
  let id = `${prefix}-${randomSuffix()}`;
  while (taken.has(id)) id = `${prefix}-${randomSuffix()}`;
  return id;
};

const collectIds = (data: Data): Set<string> => {
  const ids = new Set<string>();
  const visit = (node: ComponentData): void => {
    if (typeof node.props.id === "string") ids.add(node.props.id);
    for (const slotKey of slotKeysOf(node)) {
      const children = node.props[slotKey] as ComponentData[];
      for (const child of children) visit(child);
    }
  };
  for (const top of data.content) visit(top);
  return ids;
};

/** Walk `component` (mutating in place) and replace every props.id with a fresh,
 *  globally-unique id. `taken` is updated as ids are minted. */
const regenerateIds = (component: ComponentData, taken: Set<string>): void => {
  const next = generateId(component.type, taken);
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

/** Insert `component` (and its full subtree) at `(parentId, slotKey)` after
 *  regenerating every id to avoid collisions. Index defaults to append.
 *  Returns the updated data and the id of the inserted top-level component. */
export const paste = (
  data: Data,
  parentId: string | null,
  slotKey: string | null,
  component: ComponentData,
  config: Config,
  index?: number,
): Result<{ data: Data; id: string }, SpecOpsError> => {
  const cloned = cloneData(component);
  regenerateIds(cloned, collectIds(data));
  const id = cloned.props.id as string;
  return add(
    data,
    { parentId, slotKey, component: cloned, index },
    config,
  ).map((data) => ({ data, id }));
};
