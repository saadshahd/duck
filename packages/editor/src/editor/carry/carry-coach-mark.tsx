import { useShadowSheet } from "../overlay/index.js";
import css from "./carry.css?inline";

/** One-time coach mark anchored below the lifted element's ghost rect.
 *  Non-occluding (pointer-events: none). Dismissed on first meaningful action
 *  (click, Escape, successful drop) and never shown again after "duck:carry-seen"
 *  is written to localStorage. */
export function CarryCoachMark({ rect }: { rect: DOMRect }) {
  useShadowSheet(css);

  return (
    <div
      data-role="carry-coach-mark"
      className="carry-coach-mark"
      style={{
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      }}
    >
      Lifted · Click a slot to place · Escape to cancel
    </div>
  );
}
