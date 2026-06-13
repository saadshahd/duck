import type { Data } from "@puckeditor/core";
import { preOrder } from "@duckeditor/spec";

type NavDirection = "forward" | "backward";

const treeOrder = (data: Data): string[] => {
  const order: string[] = [];
  for (const visit of preOrder(data)) {
    order.push(visit.component.props.id as string);
  }
  return order;
};

/** Next/previous element id in pre-order. Returns null at document boundaries
 *  or for unknown ids. */
export const nextInTreeOrder = (
  data: Data,
  id: string,
  direction: NavDirection,
): string | null => {
  const order = treeOrder(data);
  const idx = order.indexOf(id);
  if (idx === -1) return null;

  const nextIdx =
    direction === "forward"
      ? (idx + 1) % order.length
      : (idx - 1 + order.length) % order.length;
  return order[nextIdx];
};

/** First element id in pre-order, or null when the document is empty. */
export const firstInTreeOrder = (data: Data): string | null =>
  treeOrder(data)[0] ?? null;
