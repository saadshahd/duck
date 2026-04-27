import type { ComponentData, Data } from "@puckeditor/core";
import { slotKeysOf } from "./slot-keys-of.js";

const foldComponent = <T>(
  component: ComponentData,
  visit: (component: ComponentData, slots: Record<string, T[]>) => T,
): T => {
  const slots = Object.fromEntries(
    slotKeysOf(component).map((slotKey) => [
      slotKey,
      (component.props[slotKey] as ComponentData[]).map((child) =>
        foldComponent(child, visit),
      ),
    ]),
  );
  return visit(component, slots);
};

/** Bottom-up fold over the whole tree. Each visit receives the component and a
 *  per-slot map of already-folded child results, in order. Returns one entry
 *  per `data.content[i]`. */
export const foldTree = <T>(
  data: Data,
  visit: (component: ComponentData, slots: Record<string, T[]>) => T,
): T[] => data.content.map((component) => foldComponent(component, visit));
