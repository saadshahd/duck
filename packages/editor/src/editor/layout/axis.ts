import type { Spec } from "@json-render/core";
import type { FiberRegistry } from "../fiber/index.js";

export type Axis = "vertical" | "horizontal";

/** Measure geometry of two adjacent siblings to determine layout axis. */
export const detectAxis = (a: DOMRect, b: DOMRect): Axis => {
  const dy = Math.abs(a.top + a.height / 2 - (b.top + b.height / 2));
  const dx = Math.abs(a.left + a.width / 2 - (b.left + b.width / 2));
  return dy > dx ? "vertical" : "horizontal";
};

/** Resolve axis for a parent by measuring its first two children. */
export const resolveParentAxis = (
  spec: Spec,
  parentId: string,
  registry: FiberRegistry,
): Axis | null => {
  const children = spec.elements[parentId]?.children;
  if (!children || children.length < 2) return null;
  const a = registry.get(children[0]);
  const b = registry.get(children[1]);
  if (!a || !b) return null;
  return detectAxis(a.getBoundingClientRect(), b.getBoundingClientRect());
};
