import { useFloating, offset, shift, autoUpdate } from "@floating-ui/react";
import { useShadowSheet, useRegistryAnchor } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import type { CycleStatus } from "../layout/index.js";
import css from "./drag.css?inline";

/** The cycle key the modality binds at entry — the entire grammar disclosure
 *  before any step is taken. */
const ENTRY_HINT: Record<"drag" | "carry", string> = {
  drag: "⇧ to cycle",
  carry: "⇥ to cycle",
};

type Props = {
  registry: FiberRegistry;
  sourceId: string;
  status: CycleStatus;
};

/** Anchored to the moving source element so it is present from modality entry —
 *  before any destination resolves — and rides the same anchor once stepping
 *  starts. Reads "⇧/⇥ to cycle" at entry, "N of M" while stepping. */
export function CycleChip({ registry, sourceId, status }: Props) {
  useShadowSheet(css);

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: [offset(4), shift({ padding: 8 })],
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useRegistryAnchor(refs, registry, sourceId);

  return (
    <div
      ref={refs.setFloating}
      data-role="cycle-chip"
      className="cycle-chip"
      style={{ ...floatingStyles, zIndex: 1 }}
    >
      {status.phase === "entry"
        ? ENTRY_HINT[status.modality]
        : `${status.step} of ${status.total}`}
    </div>
  );
}
