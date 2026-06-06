import type { Tiling } from "../layout/index.js";
import { useShadowSheet } from "./use-shadow-sheet.js";
import css from "./tiles.css?inline";

/** 1px horizontal line from the container's left edge to the marker's left edge,
 *  at the marker's vertical center. Returns null when the marker is already flush
 *  with or left of the container (width ≤ 0). */
export const leaderRect = (
  containerRect: DOMRect,
  marker: DOMRect,
): DOMRect | null => {
  const width = marker.left - containerRect.left;
  if (width <= 0) return null;
  return new DOMRect(
    containerRect.left,
    marker.top + marker.height / 2,
    width,
    1,
  );
};

type TilesProps = {
  tiling: Tiling;
  containerRect: DOMRect;
  activeSlotKey?: string;
  labels: Readonly<Record<string, string>>;
};

const DISCRETE = { width: 160, height: 24, gap: 4 };

/** Vertically centered stack of equal-height markers over the container. */
const stackRect = (
  containerRect: DOMRect,
  count: number,
  index: number,
): DOMRect => {
  const total = count * DISCRETE.height + (count - 1) * DISCRETE.gap;
  const top =
    containerRect.top +
    (containerRect.height - total) / 2 +
    index * (DISCRETE.height + DISCRETE.gap);
  const left = containerRect.left + (containerRect.width - DISCRETE.width) / 2;
  return new DOMRect(left, top, DISCRETE.width, DISCRETE.height);
};

function Tile({
  rect,
  label,
  active,
  discrete,
  carved,
}: {
  rect: DOMRect;
  label: string;
  active: boolean;
  discrete?: boolean;
  carved?: boolean;
}) {
  return (
    <div
      data-role="slot-tile"
      data-active={active || undefined}
      data-discrete={discrete || undefined}
      data-carved={carved || undefined}
      className="slot-tile"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
    >
      <span className="slot-tile-label">{label}</span>
    </div>
  );
}

function DiscreteStack({
  slotKeys,
  containerRect,
  activeSlotKey,
  labels,
}: {
  slotKeys: readonly string[];
  containerRect: DOMRect;
  activeSlotKey?: string;
  labels: Readonly<Record<string, string>>;
}) {
  return slotKeys.flatMap((slotKey, i) => {
    const markerRect = stackRect(containerRect, slotKeys.length, i);
    const leader = leaderRect(containerRect, markerRect);
    return [
      leader ? (
        <div
          key={`${slotKey}-leader`}
          data-role="slot-leader"
          className="slot-leader"
          style={{
            top: leader.top,
            left: leader.left,
            width: leader.width,
            height: leader.height,
          }}
        />
      ) : null,
      <Tile
        key={slotKey}
        rect={markerRect}
        label={labels[slotKey] ?? slotKey}
        active={slotKey === activeSlotKey}
        discrete
      />,
    ].filter(Boolean);
  });
}

/** Painted slot destinations over a container during drag. Pure visuals —
 *  pointer-events disabled; the overlay cannot host drop targets. The caller
 *  supplies geometry, the active destination, and resolved labels. */
export function Tiles({
  tiling,
  containerRect,
  activeSlotKey,
  labels,
}: TilesProps) {
  useShadowSheet(css);

  if (tiling.kind === "discrete")
    return (
      <DiscreteStack
        slotKeys={tiling.slotKeys}
        containerRect={containerRect}
        activeSlotKey={activeSlotKey}
        labels={labels}
      />
    );

  const tiles = tiling.tiles.map((tile) => (
    <Tile
      key={tile.slotKey}
      rect={tile.rect}
      label={labels[tile.slotKey] ?? tile.slotKey}
      active={tile.slotKey === activeSlotKey}
      carved={tiling.carved.includes(tile.slotKey)}
    />
  ));

  const activeYielded =
    activeSlotKey && tiling.yielded.includes(activeSlotKey)
      ? activeSlotKey
      : undefined;

  return (
    <>
      {tiles}
      {activeYielded ? (
        <Tile
          rect={stackRect(containerRect, 1, 0)}
          label={labels[activeYielded] ?? activeYielded}
          active
          discrete
        />
      ) : undefined}
    </>
  );
}
