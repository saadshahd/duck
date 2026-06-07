import type { Data } from "@puckeditor/core";
import { resolveLabel, type DropTarget } from "./destinations.js";

/** The single move-feedback datum shown during both drag and carry: what is being
 *  moved, where it will land, and whether that landing is valid. A blocked outcome
 *  (no target, an explicit no-target marker, or an unresolvable destination)
 *  names no destination — there is nowhere to land. A valid outcome always
 *  carries the destination it resolved. */
export type GhostContent = { sourceType: string } & (
  | { valid: true; destination: string }
  | { valid: false }
);

/** Resolve the move ghost's content from the dragged source type and the active
 *  drop target. The destination string is the canonical `resolveLabel` value, so
 *  the ghost names the same resolution the announcer reads. Pure: same inputs →
 *  same output. */
export const ghostContent = (
  sourceType: string,
  target: DropTarget | null,
  data: Data,
): GhostContent => {
  if (!target || target.kind === "none") return { sourceType, valid: false };
  const destination = resolveLabel(data, target);
  if (!destination) return { sourceType, valid: false };
  return { sourceType, valid: true, destination };
};
