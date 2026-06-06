import type { Data } from "@puckeditor/core";
import { Tiles } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import { slotLabels, type DropTarget } from "../layout/index.js";
import { DropIndicator } from "./drop-indicator.js";
import { DropZoneLabel } from "./drop-zone-label.js";
import { NoTargetMarker } from "./no-target-marker.js";
import { RootDropLabel } from "./root-drop-label.js";

type Props = {
  registry: FiberRegistry;
  data: Data;
  target: DropTarget;
};

/** The full drag affordance for the active drop target: a slot insert paints
 *  tiles, a between-siblings drop paints a line + label, no valid drop paints an
 *  explicit marker. Exactly one outcome renders per pointer position. */
export function DragOverlay({ registry, data, target }: Props) {
  if (target.kind === "line")
    return (
      <>
        <DropIndicator registry={registry} target={target} />
        <DropZoneLabel registry={registry} data={data} target={target} />
      </>
    );

  if (target.kind === "none")
    return <NoTargetMarker registry={registry} elementId={target.elementId} />;

  if (target.kind === "root") return <RootDropLabel label={target.label} />;

  const containerRect = registry.get(target.elementId)?.getBoundingClientRect();
  if (!containerRect) return null;

  return (
    <>
      <DropIndicator registry={registry} target={target} />
      <Tiles
        tiling={target.tiling}
        containerRect={containerRect}
        activeSlotKey={target.slotKey}
        labels={slotLabels(data, target.elementId)}
      />
    </>
  );
}
