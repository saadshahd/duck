import type { Data } from "@puckeditor/core";
import { findById, slotKeysOf } from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import { cssAxis } from "./axis.js";
import { slotRegions, type MeasuredRegion } from "./slot-regions.js";
import { tileSlots, type SlotInput, type Tiling } from "./tiles.js";

const slotInputs = (
  slotKeys: readonly string[],
  regions: readonly MeasuredRegion[],
): SlotInput[] =>
  slotKeys.map((slotKey) => {
    const measured = regions.find((r) => r.slotKey === slotKey);
    return measured ? { slotKey, rect: measured.rect } : { slotKey };
  });

/** Painted slot geometry for a container plus the per-slot child measurements it
 *  was built from. Measures each slot's children exactly once — callers that need
 *  the regions (e.g. for index resolution) reuse these instead of re-measuring.
 *  Measured-band tiling when the container is mounted, a discrete stack otherwise.
 *  The one builder for both the pointer indicator and the destination cycle. */
export const buildTiling = (args: {
  data: Data;
  containerId: string;
  registry: FiberRegistry;
}): { tiling: Tiling; regions: readonly MeasuredRegion[] } => {
  const { data, containerId, registry } = args;
  const container = findById(data, containerId);
  const slotKeys = container ? slotKeysOf(container) : [];
  const containerEl = registry.get(containerId);
  const containerRect = containerEl?.getBoundingClientRect();
  if (!containerEl || !containerRect)
    return { tiling: { kind: "discrete", slotKeys }, regions: [] };

  const regions = slotRegions({ data, parentId: containerId, registry });
  return {
    tiling: tileSlots({
      containerRect,
      slots: slotInputs(slotKeys, regions),
      cssAxis: cssAxis(containerEl) ?? undefined,
    }),
    regions,
  };
};
