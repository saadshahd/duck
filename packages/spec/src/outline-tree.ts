import type { ComponentData, Data } from "@puckeditor/core";
import { slotKeysOf } from "./slot-keys-of.js";

type FullNode = {
  readonly id: string;
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly slots: Record<string, OutlineNode[]>;
};

type SummaryNode = {
  readonly id: string;
  readonly type: string;
  readonly childCount: number;
};

export type OutlineNode = FullNode | SummaryNode;

const totalChildren = (component: ComponentData): number =>
  slotKeysOf(component).reduce(
    (sum, key) => sum + (component.props[key] as ComponentData[]).length,
    0,
  );

const nonSlotProps = (
  component: ComponentData,
  slotKeys: readonly string[],
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(component.props).filter(([key]) => !slotKeys.includes(key)),
  );

const walk = (
  component: ComponentData,
  depth: number,
  maxDepth: number,
): OutlineNode => {
  const id = component.props.id as string;
  const slotKeys = slotKeysOf(component);
  if (slotKeys.length === 0) {
    return { id, type: component.type, childCount: 0 };
  }
  if (depth >= maxDepth) {
    return { id, type: component.type, childCount: totalChildren(component) };
  }
  const slots = Object.fromEntries(
    slotKeys.map((key) => [
      key,
      (component.props[key] as ComponentData[]).map((child) =>
        walk(child, depth + 1, maxDepth),
      ),
    ]),
  );
  return {
    id,
    type: component.type,
    props: nonSlotProps(component, slotKeys),
    slots,
  };
};

/** Depth-limited tree view. At depth >= maxDepth, components collapse to a
 *  SummaryNode with `childCount` (total across all slots). One entry per
 *  `data.content[i]`. */
export const outlineTree = (data: Data, maxDepth = 2): OutlineNode[] =>
  data.content.map((component) => walk(component, 0, maxDepth));
