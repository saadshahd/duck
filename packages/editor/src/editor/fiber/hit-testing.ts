import type { FiberRegistry } from "../fiber/index.js";
import { Target } from "../machine/target.js";

export type Hit = Target;

/** Check if an event originated inside a Shadow DOM tree. */
export const isFromShadowDom = (e: Event): boolean => {
  const origin = e.composedPath()[0];
  return origin instanceof Node && origin.getRootNode() instanceof ShadowRoot;
};

/** Resolve a screen position to a spec element or slot via the fiber registry.
 *  Element hits take priority — slots are reported only when the point sits
 *  inside a slot region but on no descendant element. */
export const resolveHit = (
  registry: FiberRegistry,
  x: number,
  y: number,
): Hit | null => {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const id = registry.getNodeId(el);
  if (id && registry.get(id)) return Target.element(id);
  const slot = registry.getSlotAt(el);
  if (slot) return Target.slot(slot.parentId, slot.slotKey);
  return null;
};
