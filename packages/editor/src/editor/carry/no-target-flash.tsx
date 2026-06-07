import { useShadowSheet } from "../overlay/index.js";
import { NO_TARGET_LABEL } from "../layout/index.js";
import css from "./carry.css?inline";

type Point = { x: number; y: number };

/** Transient "no target here" flash at the pointer's last invalid click
 *  position. Visible for ~300ms, then unmounts. */
export function NoTargetFlash({ point }: { point: Point }) {
  useShadowSheet(css);

  return (
    <div
      data-role="carry-no-target-flash"
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

/** Continuous "no target here" marker tracking the pointer whenever a carry hover
 *  lands in a dead zone (outside every container). One named outcome per pointer
 *  position: a destination, or this. */
export function NoTargetHover({ point }: { point: Point }) {
  useShadowSheet(css);

  return (
    <div
      data-role="carry-no-target-hover"
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
