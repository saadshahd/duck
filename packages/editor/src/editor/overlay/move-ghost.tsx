import { useShadowSheet } from "./use-shadow-sheet.js";
import { NO_TARGET_LABEL, type GhostContent } from "../layout/index.js";
import css from "./move-ghost.css?inline";

type Point = { x: number; y: number };

/** The single pointer-anchored move ghost, shown during both drag and carry. It
 *  names the move in one place: `[source type] → [destination] · valid` over a
 *  reachable slot, `[source type] → blocked` over a dead zone. The destination
 *  substring lives in its own `data-role` element so it can be read in isolation —
 *  it is the canonical resolved-destination datum no other overlay element paints.
 *  Pure visual: pointer-events disabled, position fixed at the live pointer. */
export function MoveGhost({
  content,
  point,
}: {
  content: GhostContent;
  point: Point;
}) {
  useShadowSheet(css);

  return (
    <div
      data-role="move-ghost"
      data-valid={content.valid || undefined}
      className="move-ghost"
      style={{ position: "fixed", top: point.y + 12, left: point.x + 16 }}
    >
      <span className="move-ghost-source">{content.sourceType}</span>
      <span className="move-ghost-arrow" aria-hidden="true">
        →
      </span>
      {content.valid ? (
        <span data-role="move-ghost-destination" className="move-ghost-dest">
          {content.destination}
        </span>
      ) : (
        <span className="move-ghost-blocked">{NO_TARGET_LABEL}</span>
      )}
    </div>
  );
}
