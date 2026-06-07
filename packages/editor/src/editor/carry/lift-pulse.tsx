import { useShadowSheet } from "../overlay/index.js";
import css from "./carry.css?inline";

/** Overlay rect at the lift source's bounding rect. Mounts when carry starts;
 *  the CSS keyframe animates to invisible; unmounts when carry ends. The rect is
 *  re-resolved on every carry render (pointer move and scroll), so a scroll mid
 *  carry slides the pulse onto the source's new viewport position in lockstep
 *  with the tiles rather than freezing over stale geometry. */
export function LiftPulse({ rect }: { rect: DOMRect }) {
  useShadowSheet(css);

  return (
    <div
      data-role="lift-pulse"
      className="lift-pulse"
      style={{
        position: "absolute",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}
