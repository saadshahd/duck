import type { ComponentData, Data } from "@puckeditor/core";
import { findById, slotKeysOf } from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import type { Axis } from "./axis.js";
import {
  intersectRect,
  isCollapsed,
  rectsOverlap,
  unionRects,
} from "./rect.js";

type SlotChild = { index: number; rect: DOMRect };

/** A slot with measurable child geometry: the union of its child rects clamped
 *  to the parent, plus the individual children for index resolution. */
export type MeasuredRegion = {
  slotKey: string;
  rect: DOMRect;
  children: readonly SlotChild[];
};

type Point = { x: number; y: number };

const pointToRect = (p: Point, r: DOMRect): number =>
  Math.hypot(
    Math.max(r.left - p.x, p.x - r.right, 0),
    Math.max(r.top - p.y, p.y - r.bottom, 0),
  );

const minBy = <T>(
  items: readonly T[],
  score: (item: T) => number,
): T | undefined =>
  items.length
    ? items.reduce((a, b) => (score(b) < score(a) ? b : a))
    : undefined;

/** Insertion index inside a measured slot: nearest child rect, before or
 *  after its center along the slot axis. */
export const slotInsertIndex = ({
  point,
  axis,
  region,
}: {
  point: Point;
  axis: Axis;
  region: MeasuredRegion;
}): number => {
  const nearest = minBy(region.children, (c) => pointToRect(point, c.rect));
  if (!nearest) return 0;
  const { rect } = nearest;
  const after =
    axis === "vertical"
      ? point.y > rect.top + rect.height / 2
      : point.x > rect.left + rect.width / 2;
  return after ? nearest.index + 1 : nearest.index;
};

const measureChildren = (
  children: readonly ComponentData[],
  registry: FiberRegistry,
  parentRect: DOMRect,
): SlotChild[] =>
  children.flatMap((child, index) => {
    const rect = registry
      .get(child.props.id as string)
      ?.getBoundingClientRect();
    if (!rect || isCollapsed(rect) || !rectsOverlap(rect, parentRect))
      return [];
    return [{ index, rect }];
  });

/** Measured drop geometry for a container's slots: each slot with measurable
 *  children becomes a region (union of child rects clamped to the parent), in
 *  declaration order. Slots with no measurable geometry are omitted. */
export const slotRegions = ({
  data,
  parentId,
  registry,
}: {
  data: Data;
  parentId: string;
  registry: FiberRegistry;
}): MeasuredRegion[] => {
  const parent = findById(data, parentId);
  if (!parent) return [];
  const parentRect = registry.get(parentId)?.getBoundingClientRect();
  if (!parentRect) return [];
  return slotKeysOf(parent).flatMap((slotKey) => {
    const children = measureChildren(
      parent.props[slotKey] as ComponentData[],
      registry,
      parentRect,
    );
    if (!children.length) return [];
    return [
      {
        slotKey,
        rect: intersectRect(
          unionRects(children.map((c) => c.rect)),
          parentRect,
        ),
        children,
      } satisfies MeasuredRegion,
    ];
  });
};
