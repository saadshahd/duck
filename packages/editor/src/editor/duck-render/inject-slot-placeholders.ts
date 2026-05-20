import type { ComponentData, Data } from "@puckeditor/core";
import { isSlotOptional, slotKeysOf, type DuckMeta } from "@duckeditor/spec";

export const SLOT_PLACEHOLDER_TYPE = "__SlotPlaceholder__";

/** Synthetic id format: `__slot:<parentId>:<slotKey>`. Stable across renders. */
export const slotPlaceholderId = (parentId: string, slotKey: string): string =>
  `__slot:${parentId}:${slotKey}`;

const placeholderComponent = (
  parentId: string,
  slotKey: string,
): ComponentData => ({
  type: SLOT_PLACEHOLDER_TYPE,
  props: {
    id: slotPlaceholderId(parentId, slotKey),
    parentId,
    slotKey,
  },
});

const injectComponent = (
  component: ComponentData,
  meta: DuckMeta,
): ComponentData => {
  const slotKeys = slotKeysOf(component);
  if (slotKeys.length === 0) return component;

  let nextProps: typeof component.props | null = null;

  for (const key of slotKeys) {
    const value = component.props[key] as ComponentData[];
    const stripped = value.map((child) => injectComponent(child, meta));
    const childrenChanged = stripped.some((c, i) => c !== value[i]);

    const inject =
      value.length === 0 && isSlotOptional(meta, component.type, key);

    if (inject) {
      if (nextProps === null) nextProps = { ...component.props };
      nextProps[key] = [placeholderComponent(component.props.id, key)];
    } else if (childrenChanged) {
      if (nextProps === null) nextProps = { ...component.props };
      nextProps[key] = stripped;
    }
  }

  if (nextProps === null) return component;
  return { ...component, props: nextProps };
};

/** Editor-only transform: for each empty optional slot, inject a synthetic
 *  placeholder component so the slot has a real DOM region for selection. */
export const injectSlotPlaceholders = (
  data: Data,
  meta: DuckMeta | undefined,
): Data => {
  if (!meta) return data;
  const next = data.content.map((c) => injectComponent(c, meta));
  const changed = next.some((c, i) => c !== data.content[i]);
  return changed ? { ...data, content: next } : data;
};

/** Detect a synthetic slot placeholder. */
export const isSlotPlaceholderId = (id: string): boolean =>
  id.startsWith("__slot:");

/** Parse a synthetic id back into its slot coordinates. */
export const parseSlotPlaceholderId = (
  id: string,
): { parentId: string; slotKey: string } | null => {
  if (!id.startsWith("__slot:")) return null;
  const rest = id.slice("__slot:".length);
  const colon = rest.indexOf(":");
  if (colon < 0) return null;
  return { parentId: rest.slice(0, colon), slotKey: rest.slice(colon + 1) };
};
