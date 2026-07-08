import type { ComponentData, Config, Data } from "@puckeditor/core";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import {
  allowedTypes,
  findById,
  findParent,
  getIn,
  parentIdOf,
  sameSite,
  slotKeyOf,
  slotPathsOf,
  type ParentSite,
  type SlotPath,
} from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import {
  aimedMarker,
  aimedTile,
  buildTiling,
  geometricEdge,
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

/** The slot prop-path of a drag/drop site, or undefined at the root. */
const pathOf = (site: ParentSite): SlotPath | undefined =>
  site.at === "slot" ? site.path : undefined;

/** Post-removal insert index when the source already lives in the target slot.
 *  Null when the move would be a no-op. */
const adjustSameSlot = ({
  index,
  source,
  site,
}: {
  index: number;
  source: DragData;
  site: ParentSite;
}): number | null => {
  if (!sameSite(source, site)) return index;
  const adjusted = index > source.index ? index - 1 : index;
  return adjusted === source.index ? null : adjusted;
};

/** Insert index inside a slot: nearest-child position when measured, append
 *  otherwise (empty/unmeasurable slots have no child geometry). */
const indexInSlot = ({
  path,
  point,
  regions,
  component,
  axis,
}: {
  path: SlotPath;
  point: Point;
  regions: readonly MeasuredRegion[];
  component: ComponentData;
  axis: "vertical" | "horizontal";
}): number => {
  const measured = regions.find((r) => r.path.join(".") === path.join("."));
  if (measured) return slotInsertIndex({ point, axis, region: measured });
  return (getIn(component.props, path) as ComponentData[]).length;
};

const containerTarget = ({
  elementId,
  path,
  index,
  source,
  tiling,
  component,
}: {
  elementId: string;
  path: SlotPath;
  index: number;
  source: DragData;
  tiling: Tiling;
  component: ComponentData;
}): DropTarget | null => {
  const adjusted = adjustSameSlot({
    index,
    source,
    site: { at: "slot", parentId: elementId, path },
  });
  if (adjusted === null) return null;
  return {
    kind: "container",
    elementId,
    path,
    index: adjusted,
    tiling,
    activeLabel: qualifiedLabel(component.type, slotKeyOf(path)),
  };
};

/** Outcome of aiming at a container: a resolved drop, an explicit no-target
 *  (container exists but offers nothing valid), or a no-op (the resolved slot is
 *  where the source already sits — nothing to do). */
type ContainerOutcome =
  { tag: "target"; target: DropTarget } | { tag: "none" } | { tag: "noop" };

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
  const paths = slotPathsOf(component);
  if (!paths.length) return { tag: "none" };

  const { tiling, regions } = buildTiling({
    data,
    containerId: elementId,
    registry,
  });

  const axisOf = (path: SlotPath) =>
    resolveSlotAxis(
      data,
      { at: "slot", parentId: elementId, path },
      registry,
    ) ?? "vertical";

  const appendTo = (path: SlotPath): DropTarget | null =>
    containerTarget({
      elementId,
      path,
      index: (getIn(component.props, path) as ComponentData[]).length,
      source,
      tiling,
      component,
    });

  const current =
    previous?.kind === "container" && previous.elementId === elementId
      ? previous.path
      : undefined;

  const aimAt = (path: SlotPath): DropTarget | null =>
    containerTarget({
      elementId,
      path,
      index: indexInSlot({
        path,
        point,
        regions,
        component,
        axis: axisOf(path),
      }),
      source,
      tiling,
      component,
    });

  // Discrete tiling: no measured bands, but its labelled markers are real
  // targets — hit-test them. A marker hit resolves that slot (insert index from
  // its single child's midpoint, via `indexInSlot`); missing every marker falls
  // back to the first slot's append (the cycle reaches the rest).
  if (tiling.kind === "discrete") {
    const containerRect = registry.get(elementId)?.getBoundingClientRect();
    const marker: Tile | undefined = containerRect
      ? aimedMarker(tiling, containerRect, point, current)
      : undefined;
    return containerOutcome(marker ? aimAt(marker.path) : appendTo(paths[0]));
  }

  const tile = aimedTile(tiling, point, current);
  if (!tile) return containerOutcome(appendTo(paths[0]));

  return containerOutcome(aimAt(tile.path));
};

/** A discrete container paints its markers OVER its children's geometry, so a
 *  pointer at a marker center lands on that child — pragmatic reports a sibling
 *  drop, not the container. The marker law makes markers hit-targets in both
 *  modalities, so a marker hit on the child's parent must win over the sibling
 *  line: resolve the parent container's marker for that point. Null when the
 *  parent is not discrete, unmounted, or no marker is hit (ordinary sibling). */
const discreteMarkerOver = (args: {
  parentId: string | null;
  source: DragData;
  point: Point;
  previous: DropTarget | null;
  data: Data;
  registry: FiberRegistry;
}): DropTarget | null => {
  const { parentId, source, point, previous, data, registry } = args;
  if (!parentId) return null;
  const { tiling } = buildTiling({ data, containerId: parentId, registry });
  if (tiling.kind !== "discrete") return null;
  const containerRect = registry.get(parentId)?.getBoundingClientRect();
  if (!containerRect || !aimedMarker(tiling, containerRect, point)) return null;
  const outcome = resolveContainer({
    elementId: parentId,
    source,
    point,
    previous,
    data,
    registry,
  });
  return outcome.tag === "target" ? outcome.target : null;
};

const isBlocked = (
  config: Config | undefined,
  sourceType: string | null | undefined,
  parentType: string | undefined,
  path: SlotPath | undefined,
): boolean => {
  if (!config || !sourceType || !parentType || !path) return false;
  return !allowedTypes(config, parentType, path).has(sourceType);
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
  config,
  sourceType,
}: {
  source: TargetBag;
  target?: TargetBag;
  point: Point;
  previous: DropTarget | null;
  data: Data;
  registry: FiberRegistry;
  descendantSet: ReadonlySet<string>;
  config?: Config;
  sourceType?: string | null;
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
    // Same-parent sibling guard: a container whose slot shares the source's
    // parent/slot resolves to a reorder-beside line, not to its own interiors.
    // Shift-cycle still dives in via the destination stack.
    if (sameSite(targetData, sourceData)) {
      const rect = registry.get(targetData.elementId)?.getBoundingClientRect();
      if (!rect) return null;
      const axis = resolveSlotAxis(data, targetData, registry) ?? "vertical";
      const edge = geometricEdge(rect, point, axis);
      const insertIndex =
        edge === "top" || edge === "left"
          ? targetData.index
          : targetData.index + 1;
      const adjusted = adjustSameSlot({
        index: insertIndex,
        source: sourceData,
        site: targetData,
      });
      if (adjusted === null) return null;
      const lineParentType =
        targetData.at === "slot"
          ? findById(data, targetData.parentId)?.type
          : undefined;
      return {
        kind: "line",
        elementId: targetData.elementId,
        edge,
        axis,
        blocked: isBlocked(
          config,
          sourceType,
          lineParentType,
          pathOf(targetData),
        ),
      };
    }

    const outcome = resolveContainer({
      elementId: targetData.elementId,
      source: sourceData,
      point,
      previous,
      data,
      registry,
    });
    if (outcome.tag === "target") {
      const t = outcome.target;
      if (t.kind !== "container") return t;
      const containerType = findById(data, t.elementId)?.type;
      return {
        ...t,
        blocked: isBlocked(config, sourceType, containerType, t.path),
      };
    }
    if (outcome.tag === "noop") return null;
    return { kind: "none", elementId: targetData.elementId };
  }

  // Marker precedence: a discrete container's marker sits over its child, so a
  // pointer there reports a sibling. The marker is a hit-target — resolve it
  // before falling back to the sibling line.
  const marker = discreteMarkerOver({
    parentId: parentIdOf(targetData),
    source: sourceData,
    point,
    previous,
    data,
    registry,
  });
  if (marker) {
    if (marker.kind === "container") {
      const markerType = findById(data, marker.elementId)?.type;
      return {
        ...marker,
        blocked: isBlocked(config, sourceType, markerType, marker.path),
      };
    }
    return marker;
  }

  const axis = resolveSlotAxis(data, targetData, registry) ?? "vertical";
  const edge = extractClosestEdge(target.data);
  if (!edge) return null;

  // Same-slot: hide indicator when drop would be a no-op
  if (sameSite(targetData, sourceData)) {
    const to = resolveDropIndex(sourceData.index, target, axis);
    if (to === sourceData.index) return null;
  }

  const siblingParentType =
    targetData.at === "slot"
      ? findById(data, targetData.parentId)?.type
      : undefined;
  return {
    kind: "line",
    elementId: targetData.elementId,
    edge,
    axis,
    blocked: isBlocked(
      config,
      sourceType,
      siblingParentType,
      pathOf(targetData),
    ),
  };
}
