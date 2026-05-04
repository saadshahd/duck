import type { ComponentConfig, ComponentData } from "@puckeditor/core";

const isComponentDataLike = (value: unknown): value is ComponentData =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { type?: unknown }).type === "string" &&
  typeof (value as { props?: unknown }).props === "object" &&
  (value as { props: unknown }).props !== null &&
  typeof (value as { props: { id?: unknown } }).props.id === "string";

const isSlotValue = (value: unknown): value is ComponentData[] =>
  Array.isArray(value) && value.every(isComponentDataLike);

/** Discover slot keys on a component by duck-typing prop values.
 *  A slot value is an array whose every element is `{ type: string, props: { id: string } }`.
 *  Empty arrays satisfy this vacuously and are reported as slots. */
export const slotKeysOf = (component: ComponentData): readonly string[] =>
  Object.entries(component.props)
    .filter(([, value]) => isSlotValue(value))
    .map(([key]) => key);

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
