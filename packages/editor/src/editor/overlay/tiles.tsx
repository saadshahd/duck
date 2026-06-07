import {
  type Tile as TileGeometry,
  type Tiling,
  discreteMarkers,
  leaderRect,
} from "../layout/index.js";
import { useShadowSheet } from "./use-shadow-sheet.js";
import css from "./tiles.css?inline";

type TilesProps = {
  tiling: Tiling;
  containerRect: DOMRect;
  activeSlotKey?: string;
  labels: Readonly<Record<string, string>>;
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
  markers,
  containerRect,
  activeSlotKey,
  labels,
}: {
  markers: readonly TileGeometry[];
  containerRect: DOMRect;
  activeSlotKey?: string;
  labels: Readonly<Record<string, string>>;
}) {
  return markers.flatMap(({ slotKey, rect }) => {
    const leader = leaderRect(containerRect, rect);
    return [
      leader.width > 0 ? (
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
        rect={rect}
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
        markers={discreteMarkers(tiling, containerRect)}
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
          rect={
            discreteMarkers(
              { kind: "discrete", slots: [{ slotKey: activeYielded }] },
              containerRect,
            )[0].rect
          }
          label={labels[activeYielded] ?? activeYielded}
          active
          discrete
        />
      ) : undefined}
    </>
  );
}
