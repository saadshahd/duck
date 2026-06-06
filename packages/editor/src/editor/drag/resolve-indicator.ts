import type { ComponentData, Data } from "@puckeditor/core";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { findById, slotKeysOf } from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import {
  buildTiling,
  containsPoint,
  expandRect,
  qualifiedLabel,
  slotInsertIndex,
  type DropTarget,
  type MeasuredRegion,
  type Tile,
  type Tiling,
} from "../layout/index.js";
import {
  readData,
  resolveSlotAxis,
  resolveDropIndex,
  type DragData,
} from "./helpers.js";

type TargetBag = { data: Record<string | symbol, unknown> };
type Point = { x: number; y: number };

const TILE_HYSTERESIS = {
  top: 8,
  right: 8,
  bottom: 8,
  left: 8,
};

/** Post-removal insert index when the source already lives in the target slot.
 *  Null when the move would be a no-op. */
const adjustSameSlot = ({
  index,
  source,
  parentId,
  slotKey,
}: {
  index: number;
  source: DragData;
  parentId: string;
  slotKey: string;
}): number | null => {
  if (source.parentId !== parentId || source.slotKey !== slotKey) return index;
  const adjusted = index > source.index ? index - 1 : index;
  return adjusted === source.index ? null : adjusted;
};

/** Insert index inside a slot: nearest-child position when measured, append
 *  otherwise (empty/unmeasurable slots have no child geometry). */
const indexInSlot = ({
  slotKey,
  point,
  regions,
  component,
  axis,
}: {
  slotKey: string;
  point: Point;
  regions: readonly MeasuredRegion[];
  component: ComponentData;
  axis: "vertical" | "horizontal";
}): number => {
  const measured = regions.find((r) => r.slotKey === slotKey);
  if (measured) return slotInsertIndex({ point, axis, region: measured });
  return (component.props[slotKey] as ComponentData[]).length;
};

/** Active tile under the pointer: the current tile holds while the point stays
 *  within its 8px-expanded rect (sticky), else the tile that contains the point. */
const aimedTile = (
  tiling: Extract<Tiling, { kind: "tiled" }>,
  point: Point,
  current?: string,
): Tile | undefined => {
  const cur = tiling.tiles.find((t) => t.slotKey === current);
  if (cur && containsPoint(expandRect(cur.rect, TILE_HYSTERESIS), point))
    return cur;
  return tiling.tiles.find((t) => containsPoint(t.rect, point));
};

const containerTarget = ({
  elementId,
  slotKey,
  index,
  source,
  tiling,
  component,
}: {
  elementId: string;
  slotKey: string;
  index: number;
  source: DragData;
  tiling: Tiling;
  component: ComponentData;
}): DropTarget | null => {
  const adjusted = adjustSameSlot({
    index,
    source,
    parentId: elementId,
    slotKey,
  });
  if (adjusted === null) return null;
  return {
    kind: "container",
    elementId,
    slotKey,
    index: adjusted,
    tiling,
    activeLabel: qualifiedLabel(component.type, slotKey),
  };
};

/** Outcome of aiming at a container: a resolved drop, an explicit no-target
 *  (container exists but offers nothing valid), or a no-op (the resolved slot is
 *  where the source already sits — nothing to do). */
type ContainerOutcome =
  | { tag: "target"; target: DropTarget }
  | { tag: "none" }
  | { tag: "noop" };

const containerOutcome = (target: DropTarget | null): ContainerOutcome =>
  target ? { tag: "target", target } : { tag: "noop" };

const resolveContainer = ({
  elementId,
  source,
  point,
  previous,
  data,
  registry,
}: {
  elementId: string;
  source: DragData;
  point: Point;
  previous: DropTarget | null;
  data: Data;
  registry: FiberRegistry;
}): ContainerOutcome => {
  const component = findById(data, elementId);
  if (!component) return { tag: "none" };
  const slotKeys = slotKeysOf(component);
  if (!slotKeys.length) return { tag: "none" };

  const { tiling, regions } = buildTiling({
    data,
    containerId: elementId,
    registry,
  });

  const axisOf = (slotKey: string) =>
    resolveSlotAxis(data, elementId, slotKey, registry) ?? "vertical";

  const appendTo = (slotKey: string): DropTarget | null =>
    containerTarget({
      elementId,
      slotKey,
      index: (component.props[slotKey] as ComponentData[]).length,
      source,
      tiling,
      component,
    });

  // Discrete tiling: no aimable bands — default to the first slot's append.
  // The cycle (Task 6) is the only way to reach the others.
  if (tiling.kind === "discrete")
    return containerOutcome(appendTo(slotKeys[0]));

  const current =
    previous?.kind === "container" && previous.elementId === elementId
      ? previous.slotKey
      : undefined;
  const tile = aimedTile(tiling, point, current);
  if (!tile) return containerOutcome(appendTo(slotKeys[0]));

  return containerOutcome(
    containerTarget({
      elementId,
      slotKey: tile.slotKey,
      index: indexInSlot({
        slotKey: tile.slotKey,
        point,
        regions,
        component,
        axis: axisOf(tile.slotKey),
      }),
      source,
      tiling,
      component,
    }),
  );
};

/**
 * Pure function: given source/target drag data and the pointer position,
 * returns the indicator to render. The container indicator carries the full
 * drop spec `(elementId, slotKey, index)` plus the tiling the shell paints —
 * the drop commits the spec verbatim. A pointer inside a container that offers
 * no valid drop yields the explicit `none` outcome. Returns null only when no
 * outcome applies (self-drop, descendant, no target at all).
 */
export function resolveIndicator({
  source,
  target,
  point,
  previous,
  data,
  registry,
  descendantSet,
}: {
  source: TargetBag;
  target?: TargetBag;
  point: Point;
  previous: DropTarget | null;
  data: Data;
  registry: FiberRegistry;
  descendantSet: ReadonlySet<string>;
}): DropTarget | null {
  if (!target) return null;

  const sourceData = readData(source.data);
  const targetData = readData(target.data);

  if (
    targetData.elementId === sourceData.elementId ||
    descendantSet.has(targetData.elementId)
  )
    return null;

  if (targetData.role === "container") {
    const outcome = resolveContainer({
      elementId: targetData.elementId,
      source: sourceData,
      point,
      previous,
      data,
      registry,
    });
    if (outcome.tag === "target") return outcome.target;
    if (outcome.tag === "noop") return null;
    return { kind: "none", elementId: targetData.elementId };
  }

  const axis =
    resolveSlotAxis(data, targetData.parentId, targetData.slotKey, registry) ??
    "vertical";
  const edge = extractClosestEdge(target.data);
  if (!edge) return null;

  // Same-slot: hide indicator when drop would be a no-op
  if (
    targetData.parentId === sourceData.parentId &&
    targetData.slotKey === sourceData.slotKey
  ) {
    const to = resolveDropIndex(sourceData.index, target, axis);
    if (to === sourceData.index) return null;
  }

  return { kind: "line", elementId: targetData.elementId, edge, axis };
}
