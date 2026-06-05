import type { ComponentData } from "@puckeditor/core";
import type { DragData } from "./helpers.js";

export { stubRegistry, emptyRegistry } from "../fiber/testing.js";

export const text = (id: string): ComponentData => ({
  type: "Text",
  props: { id, text: id },
});

export const box = (id: string, items: ComponentData[]): ComponentData => ({
  type: "Box",
  props: { id, items },
});

export const bag = (d: DragData) => ({
  data: d as unknown as Record<string | symbol, unknown>,
});
