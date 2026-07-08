import type { ComponentData, Data } from "@puckeditor/core";
import { getIn, preOrder, slotPathsOf } from "@duckeditor/spec";

const isEmptyContainer = (component: ComponentData): boolean => {
  const slots = slotPathsOf(component);
  if (slots.length === 0) return false;
  return slots.every(
    (path) => (getIn(component.props, path) as ComponentData[]).length === 0,
  );
};

/**
 * IDs of components that have slots but no children in any slot.
 * Heuristic: narrows candidates for a DOM dimension check.
 * Not definitive — a catalog component could render visuals with empty slots.
 */
export const ghostCandidateIds = (data: Data): string[] => {
  const result: string[] = [];
  for (const { component } of preOrder(data)) {
    if (isEmptyContainer(component)) {
      result.push(component.props.id as string);
    }
  }
  return result;
};
