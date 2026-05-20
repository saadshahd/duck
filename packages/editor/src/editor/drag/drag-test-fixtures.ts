import type { ComponentData } from "@puckeditor/core";
import type { FiberRegistry } from "../fiber/index.js";
import type { DragData } from "./helpers.js";

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

export const stubRegistry = (
  rects: Record<string, DOMRect>,
): FiberRegistry => ({
  get: (id) => {
    const r = rects[id];
    return r ? ({ getBoundingClientRect: () => r } as HTMLElement) : undefined;
  },
  getNodeId: () => undefined,
  dispose: () => {},
});

export const emptyRegistry = stubRegistry({});
