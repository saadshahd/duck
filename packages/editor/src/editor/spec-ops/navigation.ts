import type { Data } from "@puckeditor/core";
import { preOrder } from "@json-render-editor/spec";

export type NavDirection = "forward" | "backward";

/** Next/previous element id in pre-order. Returns null at document boundaries
 *  or for unknown ids. */
export const nextInTreeOrder = (
  data: Data,
  id: string,
  direction: NavDirection,
): string | null => {
  const order: string[] = [];
  for (const visit of preOrder(data)) {
    order.push(visit.component.props.id as string);
  }
  const idx = order.indexOf(id);
  if (idx === -1) return null;

  const nextIdx = direction === "forward" ? idx + 1 : idx - 1;
  if (nextIdx < 0 || nextIdx >= order.length) return null;
  return order[nextIdx];
};
