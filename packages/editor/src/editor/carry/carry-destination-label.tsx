import { useShadowSheet } from "../overlay/index.js";
import css from "./carry.css?inline";

/** Destination label shown during carry arrow-key stepping, anchored to the
 *  viewport bottom-center. Non-occluding (pointer-events: none). Clears when
 *  the user resumes pointer movement, commits, or cancels. */
export function CarryDestinationLabel({ label }: { label: string }) {
  useShadowSheet(css);

  return (
    <div
      data-role="carry-destination-label"
      className="carry-destination-label"
    >
      {label}
    </div>
  );
}
