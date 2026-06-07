import { useShadowSheet } from "../overlay/index.js";
import { NO_TARGET_LABEL } from "../layout/index.js";
import css from "./carry.css?inline";

type Point = { x: number; y: number };

/** "No target here" marker at a pointer point. `kind` distinguishes the two
 *  lifecycles the carry state drives: a continuous `hover` while the pointer
 *  sits in a dead zone, and a transient `flash` at an invalid click. Visual is
 *  identical; the data-role lets each be queried independently. */
export function NoTargetMarker({
  point,
  kind,
}: {
  point: Point;
  kind: "hover" | "flash";
}) {
  useShadowSheet(css);

  return (
    <div
      data-role={`carry-no-target-${kind}`}
      className="carry-no-target-flash"
      style={{
        position: "absolute",
        top: point.y + 8,
        left: point.x + 8,
        zIndex: 1,
      }}
    >
      {NO_TARGET_LABEL}
    </div>
  );
}
