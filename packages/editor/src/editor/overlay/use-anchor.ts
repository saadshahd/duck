import { useEffect } from "react";
import type { UseFloatingReturn } from "@floating-ui/react";
import type { FiberRegistry } from "../fiber/index.js";
import { registryRect } from "./use-registry-anchor.js";

/** Where a floating overlay positions itself: against a registered element's live
 *  rect, or against a measured rect (e.g. a slot band) supplied by the caller. */
export type Anchor =
  | { kind: "element"; elementId: string }
  | { kind: "rect"; rect: () => DOMRect };

/** Point a floating element's position reference at one anchor. A single effect
 *  owns the reference and switches on `anchor.kind`, so element and rect anchors
 *  never race two effects over the same reference. */
export function useAnchor(
  refs: UseFloatingReturn["refs"],
  registry: FiberRegistry,
  anchor: Anchor,
): void {
  const elementId = anchor.kind === "element" ? anchor.elementId : null;
  const rect = anchor.kind === "rect" ? anchor.rect : null;
  useEffect(() => {
    refs.setPositionReference({
      getBoundingClientRect: rect ?? registryRect(registry, elementId),
    });
  }, [refs, registry, elementId, rect]);
}
