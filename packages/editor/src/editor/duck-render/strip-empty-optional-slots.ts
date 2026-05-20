import type { ComponentData, Data } from "@puckeditor/core";
import { isSlotOptional, slotKeysOf, type DuckMeta } from "@duckeditor/spec";

/** Recursively strip empty optional slot props for a single component instance.
 *  Returns the original instance when nothing changed (structural sharing). */
const stripComponent = (
  component: ComponentData,
  meta: DuckMeta,
): ComponentData => {
  const slotKeys = slotKeysOf(component);
  if (slotKeys.length === 0) return component;

  let nextProps: Record<string, unknown> | null = null;

  for (const key of slotKeys) {
    const value = component.props[key] as ComponentData[];
    const stripped = value.map((child) => stripComponent(child, meta));
    const childrenChanged = stripped.some((c, i) => c !== value[i]);
    const removeKey =
      value.length === 0 && isSlotOptional(meta, component.type, key);

    if (removeKey) {
      if (nextProps === null) nextProps = { ...component.props };
      delete nextProps[key];
    } else if (childrenChanged) {
      if (nextProps === null) nextProps = { ...component.props };
      nextProps[key] = stripped;
    }
  }

  if (nextProps === null) return component;
  return { ...component, props: nextProps as ComponentData["props"] };
};

/** Pure: walk Data, removing empty optional slot props per duck.meta.
 *  Structural sharing — untouched subtrees keep their identity.
 *  No config mutation: leaving fields intact lets Puck default the missing
 *  prop to [], so the SlotComponent renders empty content without crashing. */
export const stripEmptyOptionalSlots = (
  data: Data,
  meta: DuckMeta | undefined,
): Data => {
  if (!meta) return data;
  const next = data.content.map((c) => stripComponent(c, meta));
  const changed = next.some((c, i) => c !== data.content[i]);
  return changed ? { ...data, content: next } : data;
};
