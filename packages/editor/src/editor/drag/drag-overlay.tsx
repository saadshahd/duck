import type { Data } from "@puckeditor/core";
import { Tiles } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import { slotLabels, type DropTarget } from "../layout/index.js";
import { DropIndicator } from "./drop-indicator.js";
import { NoTargetMarker } from "./no-target-marker.js";

type Props = {
  registry: FiberRegistry;
  data: Data;
  target: DropTarget;
  altHeld?: boolean;
};

/** The spatial drag affordance for the active drop target: a slot insert paints
 *  tiles (a labelled map of reachable slots), a between-siblings drop paints a
 *  line, no valid drop paints an explicit marker. The resolved destination name
 *  and validity live in the pointer-anchored MoveGhost, not here — these are the
 *  where, the ghost is the what. Root content has no container to paint, so it is
 *  named by the ghost alone. */
export function DragOverlay({ registry, data, target, altHeld }: Props) {
  if (target.kind === "line")
    return (
      <DropIndicator registry={registry} target={target} altHeld={altHeld} />
    );

  if (target.kind === "none")
    return <NoTargetMarker registry={registry} elementId={target.elementId} />;

  if (target.kind === "root") return null;

  const containerRect = registry.get(target.elementId)?.getBoundingClientRect();
  if (!containerRect) return null;

  return (
    <>
      <DropIndicator registry={registry} target={target} altHeld={altHeld} />
      <Tiles
        tiling={target.tiling}
        containerRect={containerRect}
        activeSlotKey={target.slotKey}
        labels={slotLabels(data, target.elementId)}
      />
    </>
  );
}
