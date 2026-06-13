import type { FiberRegistry } from "../fiber/index.js";

export type Hit = { elementId: string };

/** Check if an event originated inside a Shadow DOM tree. */
export const isFromShadowDom = (e: Event): boolean => {
  const origin = e.composedPath()[0];
  return origin instanceof Node && origin.getRootNode() instanceof ShadowRoot;
};

/** Resolve a screen position to a spec element ID via the fiber registry.
 *
 * elementsFromPoint returns all elements at (x, y) ordered from topmost
 * (deepest in DOM nesting) to bottommost. Walking that list and taking the
 * first element that maps to a registered Puck ID yields the deepest Puck
 * component whose rendered bounds contain the click point — not the nearest
 * ancestor from a single arbitrary DOM node.
 */
export const resolveHit = (
  registry: FiberRegistry,
  x: number,
  y: number,
): Hit | null => {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    const id = registry.getNodeId(el);
    if (!id) continue;
    if (!registry.get(id)) continue;
    return { elementId: id };
  }
  return null;
};
