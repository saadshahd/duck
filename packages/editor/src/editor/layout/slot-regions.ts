import type { ComponentData, Data } from "@puckeditor/core";
import { findById, slotKeysOf } from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import type { Axis } from "./axis.js";
import {
  containsPoint,
  expandRect,
  intersectRect,
  isCollapsed,
  rectsOverlap,
  unionRects,
} from "./rect.js";

type SlotChild = { index: number; rect: DOMRect };

export type SlotRegion =
  | {
      slotKey: string;
      kind: "measured";
      rect: DOMRect;
      children: readonly SlotChild[];
    }
  | { slotKey: string; kind: "chip" };

export type MeasuredRegion = Extract<SlotRegion, { kind: "measured" }>;

type Point = { x: number; y: number };

const HYSTERESIS = 8;
const HYSTERESIS_EDGES = {
  top: HYSTERESIS,
  right: HYSTERESIS,
  bottom: HYSTERESIS,
  left: HYSTERESIS,
};


const pointToRect = (p: Point, r: DOMRect): number =>
  Math.hypot(
    Math.max(r.left - p.x, p.x - r.right, 0),
    Math.max(r.top - p.y, p.y - r.bottom, 0),
  );

const nearestChildDistance = (region: MeasuredRegion, p: Point): number =>
  Math.min(...region.children.map((c) => pointToRect(p, c.rect)));

const minBy = <T>(
  items: readonly T[],
  score: (item: T) => number,
): T | undefined =>
  items.length
    ? items.reduce((a, b) => (score(b) < score(a) ? b : a))
    : undefined;

/** Hit-test a point against slot regions with hysteresis: the current slot
 *  holds until the point is clearly inside another region. Overlapping hits
 *  resolve to the region owning the nearest individual child rect. */
export const resolveSlot = ({
  point,
  regions,
  current,
}: {
  point: Point;
  regions: readonly SlotRegion[];
  current?: string;
}): MeasuredRegion | undefined => {
  const measured = regions.filter(
    (r): r is MeasuredRegion => r.kind === "measured",
  );
  const cur = measured.find((r) => r.slotKey === current);
  if (cur && containsPoint(expandRect(cur.rect, HYSTERESIS_EDGES), point))
    return cur;
  const hits = measured.filter((r) => containsPoint(r.rect, point));
  if (hits.length > 1)
    return minBy(hits, (r) => nearestChildDistance(r, point));
  return hits[0] ?? cur ?? minBy(measured, (r) => pointToRect(point, r.rect));
};

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

/** Per-slot drop geometry for a container: measurable slots become regions
 *  (union of child rects clamped to the parent), unmeasurable slots become chips. */
export const slotRegions = ({
  data,
  parentId,
  registry,
}: {
  data: Data;
  parentId: string;
  registry: FiberRegistry;
}): SlotRegion[] => {
  const parent = findById(data, parentId);
  if (!parent) return [];
  const parentRect = registry.get(parentId)?.getBoundingClientRect();
  return slotKeysOf(parent).map((slotKey): SlotRegion => {
    if (!parentRect) return { slotKey, kind: "chip" };
    const children = measureChildren(
      parent.props[slotKey] as ComponentData[],
      registry,
      parentRect,
    );
    if (!children.length) return { slotKey, kind: "chip" };
    return {
      slotKey,
      kind: "measured",
      rect: intersectRect(unionRects(children.map((c) => c.rect)), parentRect),
      children,
    };
  });
};
