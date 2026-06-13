import { useShadowSheet } from "../overlay/index.js";
import css from "./drag.css?inline";

type Point = { x: number; y: number };

/** Transient cancel confirmation shown at the release point when a drag ends
 *  with no valid drop target. Fades out after ~600ms via CSS animation. */
export function DragCancelFlash({ point }: { point: Point }) {
  useShadowSheet(css);

  return (
    <div
      data-role="drag-cancel-flash"
      className="drag-cancel-flash"
      style={{ top: point.y + 8, left: point.x + 8 }}
    >
      × Cancelled
    </div>
  );
}
