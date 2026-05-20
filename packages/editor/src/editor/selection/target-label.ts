import { buildIndex } from "@duckeditor/spec";
import type { Target } from "../machine/index.js";

type Index = ReturnType<typeof buildIndex>;

/** Human-readable label for a target — element type for elements, slot key for slots. */
export const targetLabel = (
  target: Target | null,
  index: Index,
): string | undefined => {
  if (!target) return undefined;
  if (target.kind === "slot") return target.slotKey;
  return index.get(target.elementId)?.component.type;
};
