import { slotKeyOf, type SlotPath } from "@duckeditor/spec";
import {
  type Tile as TileGeometry,
  type Tiling,
  discreteMarkers,
  leaderRect,
} from "../layout/index.js";
import { useShadowSheet } from "./use-shadow-sheet.js";
import css from "./tiles.css?inline";

const pathKey = (path: SlotPath): string => path.join(".");
const samePath = (a: SlotPath, b: SlotPath): boolean =>
  pathKey(a) === pathKey(b);

type TilesProps = {
  tiling: Tiling;
  containerRect: DOMRect;
  activePath?: SlotPath;
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
  activePath,
  labels,
}: {
  markers: readonly TileGeometry[];
  containerRect: DOMRect;
  activePath?: SlotPath;
  labels: Readonly<Record<string, string>>;
}) {
  return markers.flatMap(({ path, rect }) => {
    const key = pathKey(path);
    const leader = leaderRect(containerRect, rect);
    return [
      leader.width > 0 ? (
        <div
          key={`${key}-leader`}
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
        key={key}
        rect={rect}
        label={labels[key] ?? slotKeyOf(path)}
        active={activePath ? samePath(path, activePath) : false}
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
  activePath,
  labels,
}: TilesProps) {
  useShadowSheet(css);

  if (tiling.kind === "discrete")
    return (
      <DiscreteStack
        markers={discreteMarkers(tiling, containerRect)}
        containerRect={containerRect}
        activePath={activePath}
        labels={labels}
      />
    );

  const tiles = tiling.tiles.map((tile) => (
    <Tile
      key={pathKey(tile.path)}
      rect={tile.rect}
      label={labels[pathKey(tile.path)] ?? slotKeyOf(tile.path)}
      active={activePath ? samePath(tile.path, activePath) : false}
      carved={tiling.carved.some((p) => samePath(p, tile.path))}
    />
  ));

  const activeYielded =
    activePath && tiling.yielded.some((p) => samePath(p, activePath))
      ? activePath
      : undefined;

  return (
    <>
      {tiles}
      {activeYielded ? (
        <Tile
          rect={
            discreteMarkers(
              { kind: "discrete", slots: [{ path: activeYielded }] },
              containerRect,
            )[0].rect
          }
          label={labels[pathKey(activeYielded)] ?? slotKeyOf(activeYielded)}
          active
          discrete
        />
      ) : undefined}
    </>
  );
}
