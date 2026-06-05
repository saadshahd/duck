import type { ComponentData, Data } from "@puckeditor/core";
import { findById } from "@duckeditor/spec";
import { useShadowSheet } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import { slotRegions, type DropTarget } from "../layout/index.js";
import { CONTAINER_THRESHOLD } from "./helpers.js";
import css from "./drag.css?inline";

type ChipSpec = { slotKey: string; index: number };
type LaidOutChip = ChipSpec & { rect: DOMRect };

/** Chips for a container's unmeasurable slots: slot key + append index. */
export const chipSpecs = ({
  data,
  containerId,
  registry,
}: {
  data: Data;
  containerId: string;
  registry: FiberRegistry;
}): ChipSpec[] => {
  const component = findById(data, containerId);
  if (!component) return [];
  return slotRegions({ data, parentId: containerId, registry })
    .filter((region) => region.kind === "chip")
    .map(({ slotKey }) => ({
      slotKey,
      index: (component.props[slotKey] as ComponentData[]).length,
    }));
};

const CHIP = { width: 96, height: 22, gap: 4 };

/** Deterministic chip geometry, docked at the bottom of the container's drop
 *  zone. Rendering and drag hit-testing both derive from this one layout —
 *  chips are visuals, not DOM drop targets (shadow DOM retargeting hides
 *  overlay elements from pragmatic-dnd). */
export const chipLayout = ({
  containerRect,
  specs,
}: {
  containerRect: DOMRect;
  specs: readonly ChipSpec[];
}): LaidOutChip[] => {
  const left =
    containerRect.left + containerRect.width * CONTAINER_THRESHOLD + CHIP.gap;
  const top =
    containerRect.top +
    containerRect.height * (1 - CONTAINER_THRESHOLD) -
    CHIP.height -
    CHIP.gap;
  return specs.map((spec, i) => ({
    ...spec,
    rect: new DOMRect(
      left + i * (CHIP.width + CHIP.gap),
      top,
      CHIP.width,
      CHIP.height,
    ),
  }));
};

type Props = { registry: FiberRegistry; data: Data; target: DropTarget };

/** Labeled drop chips for slots with no measurable geometry, shown in the
 *  hovered container during a container drop. */
export function SlotChips({ registry, data, target }: Props) {
  useShadowSheet(css);
  if (target.kind !== "container") return null;

  const containerRect = registry.get(target.elementId)?.getBoundingClientRect();
  if (!containerRect) return null;

  const chips = chipLayout({
    containerRect,
    specs: chipSpecs({ data, containerId: target.elementId, registry }),
  });

  return chips.map(({ slotKey, rect }) => (
    <div
      key={slotKey}
      data-role="slot-chip"
      data-active={target.slotKey === slotKey || undefined}
      className="slot-chip"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
    >
      {slotKey}
    </div>
  ));
}
