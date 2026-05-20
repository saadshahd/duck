import type { Data } from "@puckeditor/core";
import { getChildrenAt } from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import type { Target } from "../machine/target.js";

/** Union two rects by their outer edges. */
const union = (a: DOMRect, b: DOMRect): DOMRect => {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.right, b.right);
  const bottom = Math.max(a.bottom, b.bottom);
  return new DOMRect(left, top, right - left, bottom - top);
};

const elementRect = (
  registry: FiberRegistry,
  elementId: string,
): DOMRect | null => {
  const el = registry.get(elementId);
  return el ? el.getBoundingClientRect() : null;
};

const slotRect = (
  registry: FiberRegistry,
  data: Data,
  parentId: string,
  slotKey: string,
): DOMRect | null => {
  const children = getChildrenAt(data, parentId, slotKey) ?? [];
  const childRects: DOMRect[] = [];
  for (const child of children) {
    const el = registry.get(child.props.id);
    if (el) childRects.push(el.getBoundingClientRect());
  }
  if (childRects.length > 0) return childRects.reduce(union);
  const host = registry.getSlot(parentId, slotKey);
  return host ? host.getBoundingClientRect() : null;
};

/** Resolve a target's bounding rect against the live DOM.
 *  Element targets read directly from the registry; slot targets union their
 *  children, falling back to a registered slot host (e.g. empty placeholder). */
export const rectOf = (
  registry: FiberRegistry,
  data: Data,
  target: Target,
): DOMRect | null =>
  target.kind === "element"
    ? elementRect(registry, target.elementId)
    : slotRect(registry, data, target.parentId, target.slotKey);
