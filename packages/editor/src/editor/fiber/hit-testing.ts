import type { FiberRegistry } from "../fiber/index.js";

export type Hit = { elementId: string };

/** Check if an event originated inside a Shadow DOM tree. */
export const isFromShadowDom = (e: Event): boolean => {
  const origin = e.composedPath()[0];
  return origin instanceof Node && origin.getRootNode() instanceof ShadowRoot;
};

/** Resolve a screen position to a spec element ID via the fiber registry. */
export const resolveHit = (
  registry: FiberRegistry,
  x: number,
  y: number,
): Hit | null => {
  const target = document.elementFromPoint(x, y);
  if (!target) return null;
  const id = registry.getNodeId(target);
  if (!id) return null;
  if (!registry.get(id)) return null;
  return { elementId: id };
};
