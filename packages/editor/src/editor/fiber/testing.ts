import type { FiberRegistry } from "./registry.js";

export const stubRegistry = (rects: Record<string, DOMRect>): FiberRegistry => {
  const elements = new Map(
    Object.entries(rects).map(([id, rect]) => {
      const element = document.createElement("div");
      element.getBoundingClientRect = () => rect;
      return [id, element] as const;
    }),
  );

  return {
    get: (id) => elements.get(id),
    getNodeId: () => undefined,
    dispose: () => {},
  };
};

export const emptyRegistry = stubRegistry({});
