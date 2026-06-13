import { useShadowSheet } from "../overlay/index.js";
import css from "./drag.css?inline";

/** Transient single-line tip shown after a cross-slot drag silently fails.
 *  Fixed to the viewport bottom-center so it never occludes the canvas.
 *  Auto-dismissed after 3 s or on next click/keydown (driven by parent). */
export function CrossSlotHint() {
  useShadowSheet(css);

  return (
    <div data-role="cross-slot-hint" className="cross-slot-hint">
      Cross-slot moves use Space → click — try it
    </div>
  );
}
