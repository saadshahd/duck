import type { Data } from "@puckeditor/core";
import { getChildrenAt } from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import { buildTiling } from "./tiling.js";
import { discreteMarkers } from "./tiles.js";
import { containsPoint } from "./rect.js";

/** The overlay-band rect for a single slot of a container, drawn from the same
 *  tiling the drag overlay uses: measured slots get their tile band, empty slots
 *  get a carved strip, scatter layouts get a discrete marker. So every slot of a
 *  node — including empties — has a distinct, non-overlapping choice band.
 *  Undefined when the slot is absent from the tiling (unknown slot/parent). */
export const slotChoiceRect = (args: {
  data: Data;
  parentId: string;
  slotKey: string;
  registry: FiberRegistry;
}): DOMRect | undefined => {
  const { data, parentId, slotKey, registry } = args;
  const { tiling } = buildTiling({ data, containerId: parentId, registry });

  if (tiling.kind === "tiled")
    return tiling.tiles.find((t) => t.slotKey === slotKey)?.rect;

  const containerRect = registry.get(parentId)?.getBoundingClientRect();
  if (!containerRect) return undefined;
  return discreteMarkers(tiling, containerRect).find(
    (m) => m.slotKey === slotKey,
  )?.rect;
};

/** The id of the slot child whose rendered rect contains `point`, or undefined
 *  when the point falls in the slot's padding (no child under it). Lets a slot
 *  band tell "click on a child" (select the child) from "click in slot padding"
 *  (keep the slot) without re-running DOM hit-testing through the overlay band. */
export const slotChildAt = (args: {
  data: Data;
  parentId: string;
  slotKey: string;
  registry: FiberRegistry;
  point: { x: number; y: number };
}): string | undefined => {
  const { data, parentId, slotKey, registry, point } = args;
  const children = getChildrenAt(data, parentId, slotKey) ?? [];
  return children
    .map((child) => child.props.id as string)
    .find((id) => {
      const rect = registry.get(id)?.getBoundingClientRect();
      return rect ? containsPoint(rect, point) : false;
    });
};
