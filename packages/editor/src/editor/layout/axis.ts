import type { Data } from "@puckeditor/core";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { getChildrenAt } from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";

export type Axis = "vertical" | "horizontal";

type Point = { x: number; y: number };

/** Which side of a rect a point falls on, along the layout axis: the near edge
 *  when the point is before the rect's midpoint, the far edge otherwise.
 *  Vertical axis splits top/bottom; horizontal splits left/right. */
export const geometricEdge = (rect: DOMRect, point: Point, axis: Axis): Edge =>
  axis === "vertical"
    ? point.y < rect.top + rect.height / 2
      ? "top"
      : "bottom"
    : point.x < rect.left + rect.width / 2
      ? "left"
      : "right";

const isFlexColumn = (direction: string): boolean =>
  direction.startsWith("column");
const isGridColumn = (autoFlow: string): boolean => autoFlow.includes("column");

const BLOCK_DISPLAYS = new Set(["block", "flow-root", "list-item"]);

/** Determine layout axis from an element's computed CSS display properties.
 *  Returns null for display values with no detectable block axis
 *  (inline, contents, table, none, …). */
export const cssAxis = (el: Element): Axis | null => {
  const cs = getComputedStyle(el);
  const display = cs.display;

  if (display === "flex" || display === "inline-flex") {
    return isFlexColumn(cs.flexDirection) ? "vertical" : "horizontal";
  }
  if (display === "grid" || display === "inline-grid") {
    return isGridColumn(cs.gridAutoFlow) ? "horizontal" : "vertical";
  }
  if (BLOCK_DISPLAYS.has(display)) return "vertical";
  return null;
};

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
