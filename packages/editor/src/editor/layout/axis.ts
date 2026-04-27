import type { Data } from "@puckeditor/core";
import { getChildrenAt } from "@json-render-editor/spec";
import type { FiberRegistry } from "../fiber/index.js";

export type Axis = "vertical" | "horizontal";

/** Measure geometry of two adjacent siblings to determine layout axis. */
export const detectAxis = (a: DOMRect, b: DOMRect): Axis => {
  const dy = Math.abs(a.top + a.height / 2 - (b.top + b.height / 2));
  const dx = Math.abs(a.left + a.width / 2 - (b.left + b.width / 2));
  return dy > dx ? "vertical" : "horizontal";
};

/** Resolve axis for a slot by measuring its first two children.
 *  `parentId === null && slotKey === null` measures the top-level (`data.content`). */
export const resolveSlotAxis = (
  data: Data,
  parentId: string | null,
  slotKey: string | null,
  registry: FiberRegistry,
): Axis | null => {
  const children = getChildrenAt(data, parentId, slotKey);
  if (!children || children.length < 2) return null;
  const a = registry.get(children[0].props.id as string);
  const b = registry.get(children[1].props.id as string);
  if (!a || !b) return null;
  return detectAxis(a.getBoundingClientRect(), b.getBoundingClientRect());
};
