import type { ComponentData, Config, Data } from "@puckeditor/core";
import { err, ok, type Result } from "neverthrow";
import {
  allowedTypes,
  componentDef,
  getChildrenAt,
  getIn,
  slotKeyOf,
  slotKeysFromConfig,
  slotPathsOf,
  writableChildrenAt,
  type ParentSite,
} from "@duckeditor/spec";
import { type SpecOpsError, cloneAndMutate, findById } from "./helpers.js";
import { mintId, takenIds } from "./id.js";

/** Remint the id of every child reachable through `component`'s slots
 *  (including nested array-item slots), recursively. Mutates in place —
 *  callers own a clone before calling this. */
const remintChildren = (component: ComponentData, taken: Set<string>): void => {
  for (const slotPath of slotPathsOf(component)) {
    const children = getIn(component.props, slotPath) as ComponentData[];
    children.forEach((child, i) => {
      const id = mintId(child.type, taken);
      taken.add(id);
      children[i] = { ...child, props: { ...child.props, id } };
      remintChildren(children[i], taken);
    });
  }
};

/** Clone `component` and remint every descendant id (own id untouched). */
const remintSlots = (
  component: ComponentData,
  taken: Set<string>,
): ComponentData => {
  const clone = structuredClone(component);
  remintChildren(clone, taken);
  return clone;
};

/** Insert `component` at `site` and `index?`. Append when index undefined.
 *
 *  - The root site targets `data.content`.
 *  - Defaults from `config.components[type].defaultProps` are merged behind caller props.
 *  - Slot fields not provided by caller are initialised to `[]`.
 *  - A unique id is generated if one isn't supplied.
 *  - Errors: `parent-not-found`, `slot-not-defined`, `index-out-of-bounds`. */
export const add = (
  data: Data,
  args: {
    site: ParentSite;
    component: ComponentData;
    index?: number;
  },
  config: Config,
): Result<Data, SpecOpsError> => {
  const { site, component, index } = args;

  if (site.at === "slot" && !findById(data, site.parentId))
    return err({ tag: "parent-not-found", parentId: site.parentId });

  const targeted = getChildrenAt(data, site);
  if (targeted === null)
    return err({
      tag: "slot-not-defined",
      parentId: site.at === "slot" ? site.parentId : "",
      slotKey: site.at === "slot" ? slotKeyOf(site.path) : "",
    });

  if (site.at === "slot") {
    const parentType = findById(data, site.parentId)?.type;
    if (
      parentType &&
      !allowedTypes(config, parentType, site.path).has(component.type)
    )
      return err({
        tag: "disallowed-type",
        parentId: site.parentId,
        slotKey: slotKeyOf(site.path),
        componentType: component.type,
      });
  }

  const insertIndex = index ?? targeted.length;
  if (insertIndex < 0 || insertIndex > targeted.length)
    return err({
      tag: "index-out-of-bounds",
      index: insertIndex,
      length: targeted.length,
    });

  const taken = takenIds(data);
  const incomingId =
    typeof component.props.id === "string" && component.props.id.length > 0
      ? component.props.id
      : mintId(component.type, taken);

  const slotKeys = slotKeysFromConfig(config, component.type);
  const defaultProps = componentDef(config, component.type)?.defaultProps ?? {};
  const slotInit = Object.fromEntries(
    slotKeys.map((k) => [k, [] as unknown[]]),
  );
  taken.add(incomingId);
  const prepared = remintSlots(
    {
      ...component,
      props: {
        ...slotInit,
        ...defaultProps,
        ...component.props,
        id: incomingId,
      },
    },
    taken,
  );

  return ok(
    cloneAndMutate(data, (draft) => {
      const writable = writableChildrenAt(draft, site);
      if (writable === null) return;
      writable.splice(insertIndex, 0, prepared);
    }),
  );
};
