import type { ComponentConfig, ComponentData } from "@puckeditor/core";
import type { SlotPath } from "./path.js";

const isComponentDataLike = (value: unknown): value is ComponentData =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { type?: unknown }).type === "string" &&
  typeof (value as { props?: unknown }).props === "object" &&
  (value as { props: unknown }).props !== null &&
  typeof (value as { props: { id?: unknown } }).props.id === "string";

/** A slot value is an array whose every element is `{ type, props: { id } }`.
 *  Empty arrays satisfy this vacuously and count as slots. */
export const isSlotValue = (value: unknown): value is ComponentData[] =>
  Array.isArray(value) && value.every(isComponentDataLike);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Every slot's prop-path within `props`. A slot array is emitted as its path;
 *  arrays-of-plain-objects and plain objects are descended (so array-item and
 *  object-nested slots are found); primitives and primitive arrays are skipped. */
const slotPathsIn = (
  props: Record<string, unknown>,
  prefix: SlotPath,
): SlotPath[] =>
  Object.entries(props).flatMap(([key, value]) => {
    const here: SlotPath = [...prefix, key];
    if (isSlotValue(value)) return [here];
    if (Array.isArray(value))
      return value.flatMap((item, index) =>
        isPlainObject(item) ? slotPathsIn(item, [...here, index]) : [],
      );
    if (isPlainObject(value)) return slotPathsIn(value, here);
    return [];
  });

/** Discover every slot on a component by duck-typing prop values, at any prop
 *  nesting depth (top-level, array-item, object-nested). */
export const slotPathsOf = (component: ComponentData): readonly SlotPath[] =>
  slotPathsIn(component.props, []);

/** Top-level slot keys — the single-segment subset of `slotPathsOf`. */
export const slotKeysOf = (component: ComponentData): readonly string[] =>
  slotPathsOf(component)
    .filter((path) => path.length === 1)
    .map((path) => path[0] as string);

type WithComponents = { components: Record<string, ComponentConfig> };

/** Read a component's definition from config. */
export const componentDef = (
  config: WithComponents,
  type: string,
): ComponentConfig | undefined => config.components[type];

/** Discover declared slot keys on a Puck component from its config. */
export const slotKeysFromConfig = (
  config: WithComponents,
  type: string,
): readonly string[] => {
  const fields = componentDef(config, type)?.fields;
  if (!fields) return [];
  return Object.entries(fields)
    .filter(([, f]) => f?.type === "slot")
    .map(([k]) => k);
};
