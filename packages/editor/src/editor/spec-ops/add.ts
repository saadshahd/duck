import type { ComponentData, Data } from "@puckeditor/core";
import { err, ok, type Result } from "neverthrow";
import { getChildrenAt, slotKeysOf } from "@duck/spec";
import {
  type SpecOpsError,
  cloneAndMutate,
  findById,
  writableChildrenAt,
} from "./helpers.js";

export type ComponentMap = Record<
  string,
  { defaultProps?: Record<string, unknown> } | undefined
>;

const randomSuffix = (): string => Math.random().toString(36).slice(2, 8);

const generateId = (type: string, taken: ReadonlySet<string>): string => {
  const prefix = type.toLowerCase();
  let id = `${prefix}-${randomSuffix()}`;
  while (taken.has(id)) id = `${prefix}-${randomSuffix()}`;
  return id;
};

const defaultsFor = (
  components: ComponentMap,
  type: string,
): Record<string, unknown> => components[type]?.defaultProps ?? {};

const declaredSlotKeys = (
  components: ComponentMap,
  type: string,
): readonly string[] =>
  Object.entries(defaultsFor(components, type))
    .filter(([, v]) => Array.isArray(v))
    .map(([k]) => k);

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

const remintSlots = (
  component: ComponentData,
  taken: Set<string>,
): ComponentData => {
  const slots = new Set(slotKeysOf(component));
  if (slots.size === 0) return component;
  const remintChild = (child: ComponentData): ComponentData => {
    const id = generateId(child.type, taken);
    taken.add(id);
    return remintSlots({ ...child, props: { ...child.props, id } }, taken);
  };
  return {
    ...component,
    props: Object.fromEntries(
      Object.entries(component.props).map(([k, v]) =>
        slots.has(k) ? [k, (v as ComponentData[]).map(remintChild)] : [k, v],
      ),
    ) as ComponentData["props"],
  };
};

/** Insert `component` at `(parentId, slotKey, index?)`. Append when index undefined.
 *
 *  - `parentId === null && slotKey === null` targets `data.content`.
 *  - Defaults from `components[type].defaultProps` are merged behind caller props.
 *  - Slot fields not provided by caller are initialised to `[]`.
 *  - A unique id is generated if one isn't supplied.
 *  - Errors: `parent-not-found`, `slot-not-defined`, `index-out-of-bounds`. */
export const add = (
  data: Data,
  args: {
    parentId: string | null;
    slotKey: string | null;
    component: ComponentData;
    index?: number;
  },
  components: ComponentMap,
): Result<Data, SpecOpsError> => {
  const { parentId, slotKey, component, index } = args;

  if (parentId !== null && !findById(data, parentId))
    return err({ tag: "parent-not-found", parentId });

  const targeted = getChildrenAt(data, parentId, slotKey);
  if (targeted === null)
    return err({
      tag: "slot-not-defined",
      parentId: parentId ?? "",
      slotKey: slotKey ?? "",
    });

  const insertIndex = index ?? targeted.length;
  if (insertIndex < 0 || insertIndex > targeted.length)
    return err({
      tag: "index-out-of-bounds",
      index: insertIndex,
      length: targeted.length,
    });

  const taken = collectIds(data);
  const incomingId =
    typeof component.props.id === "string" && component.props.id.length > 0
      ? component.props.id
      : generateId(component.type, taken);

  const slotInit = Object.fromEntries(
    declaredSlotKeys(components, component.type).map((k) => [
      k,
      [] as unknown[],
    ]),
  );
  taken.add(incomingId);
  const prepared = remintSlots(
    {
      ...component,
      props: {
        ...slotInit,
        ...defaultsFor(components, component.type),
        ...component.props,
        id: incomingId,
      },
    },
    taken,
  );

  return ok(
    cloneAndMutate(data, (draft) => {
      const writable = writableChildrenAt(draft, parentId, slotKey);
      if (writable === null) return;
      writable.splice(insertIndex, 0, prepared);
    }),
  );
};
