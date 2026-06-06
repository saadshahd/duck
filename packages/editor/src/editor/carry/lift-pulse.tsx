import { useShadowSheet } from "../overlay/index.js";
import css from "./carry.css?inline";

/** One-shot overlay rect at the lift source's bounding rect. Mounts when carry
 *  starts; the CSS keyframe animates to invisible; unmounts when carry ends.
 *  Uses a snapshot rect captured at mount — acceptable because the pulse is
 *  instantaneous and the source position doesn't change during the 250ms animation. */
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
