import type { FiberRegistry } from "./registry.js";

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
