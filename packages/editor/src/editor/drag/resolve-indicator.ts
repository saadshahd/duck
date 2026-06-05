import type { ComponentData, Data } from "@puckeditor/core";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { findById, slotKeysOf } from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import {
  containsPoint,
  resolveSlot,
  slotInsertIndex,
  slotRegions,
} from "../layout/index.js";
import type { DropTarget } from "./drop-indicator.js";
import { chipLayout, chipSpecs } from "./slot-chips.js";
import {
  readData,
  resolveSlotAxis,
  resolveDropIndex,
  type DragData,
} from "./helpers.js";

type TargetBag = { data: Record<string | symbol, unknown> };
type Point = { x: number; y: number };

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

const containerIndicator = ({
  elementId,
  slotKey,
  index,
  source,
  region,
}: {
  elementId: string;
  slotKey: string;
  index: number;
  source: DragData;
  region?: DOMRect;
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
    ...(region && { region }),
  };
};

/** Chips have hit-test priority inside their own rects — same geometry the
 *  overlay renders. */
const chipIndicator = ({
  containerId,
  source,
  point,
  data,
  registry,
}: {
  containerId: string;
  source: DragData;
  point: Point;
  data: Data;
  registry: FiberRegistry;
}): DropTarget | null => {
  const containerRect = registry.get(containerId)?.getBoundingClientRect();
  if (!containerRect) return null;
  const chip = chipLayout({
    containerRect,
    specs: chipSpecs({ data, containerId, registry }),
  }).find((c) => containsPoint(c.rect, point));
  if (!chip) return null;
  return containerIndicator({
    elementId: containerId,
    slotKey: chip.slotKey,
    index: chip.index,
    source,
  });
};

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
}): DropTarget | null => {
  const component = findById(data, elementId);
  if (!component) return null;
  const slots = slotKeysOf(component);
  if (!slots.length) return null;

  const childrenAt = (slotKey: string) =>
    component.props[slotKey] as ComponentData[];
  const appendTo = (slotKey: string) =>
    containerIndicator({
      elementId,
      slotKey,
      index: childrenAt(slotKey).length,
      source,
    });

  // Single populated slot: existing append path, untouched.
  if (slots.length === 1 && childrenAt(slots[0]).length > 0)
    return appendTo(slots[0]);

  const chip = chipIndicator({
    containerId: elementId,
    source,
    point,
    data,
    registry,
  });
  if (chip) return chip;

  const regions = slotRegions({ data, parentId: elementId, registry });
  const current =
    previous?.kind === "container" && previous.elementId === elementId
      ? previous.slotKey
      : undefined;
  const resolved = resolveSlot({ point, regions, current });
  if (!resolved) return appendTo(slots[0]);

  const axis =
    resolveSlotAxis(data, elementId, resolved.slotKey, registry) ?? "vertical";
  return containerIndicator({
    elementId,
    slotKey: resolved.slotKey,
    index: slotInsertIndex({ point, axis, region: resolved }),
    source,
    region: resolved.rect,
  });
};

/**
 * Pure function: given source/target drag data and the pointer position,
 * returns the indicator to render. The container indicator carries the full
 * drop spec `(elementId, slotKey, index)` — the drop commits it verbatim.
 * Returns null when no indicator should be shown (self-drop, descendant, no-op).
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

  // Pointer over a chip of the container we're already targeting — the chip
  // overlays page content, so the drop target beneath it can be a sibling.
  if (
    previous?.kind === "container" &&
    previous.elementId !== sourceData.elementId &&
    !descendantSet.has(previous.elementId)
  ) {
    const chip = chipIndicator({
      containerId: previous.elementId,
      source: sourceData,
      point,
      data,
      registry,
    });
    if (chip) return chip;
  }

  if (targetData.role === "container")
    return resolveContainer({
      elementId: targetData.elementId,
      source: sourceData,
      point,
      previous,
      data,
      registry,
    });

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
