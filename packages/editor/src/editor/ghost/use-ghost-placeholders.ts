import { useEffect, useRef } from "react";
import type { Data } from "@puckeditor/core";
import type { FiberRegistry } from "../fiber/index.js";
import { ghostCandidateIds, isCollapsed } from "../layout/index.js";
import { GHOST_MIN_HEIGHT } from "./constants.js";

// --- Constants & types ---

const STYLE_KEYS = [
  "minHeight",
  "minWidth",
  "outline",
  "outlineOffset",
] as const;
type StyleKey = (typeof STYLE_KEYS)[number];
type SavedStyles = Record<StyleKey, string>;

const GHOST_STYLES: SavedStyles = {
  minHeight: `${GHOST_MIN_HEIGHT}px`,
  minWidth: `${GHOST_MIN_HEIGHT}px`,
  outline: "1px dashed rgba(0, 0, 0, 0.12)",
  outlineOffset: "-1px",
};

// --- Helpers ---

const saveStyles = (el: HTMLElement): SavedStyles =>
  Object.fromEntries(STYLE_KEYS.map((k) => [k, el.style[k]])) as SavedStyles;

const applyStyles = (el: HTMLElement, styles: SavedStyles): void => {
  for (const k of STYLE_KEYS) el.style[k] = styles[k];
};

// --- Reconciliation ---

/** Tree heuristic + DOM measurement to find currently-collapsed components. */
const detectGhosts = (
  data: Data,
  registry: FiberRegistry,
  active: Map<string, SavedStyles>,
): Set<string> =>
  new Set(
    ghostCandidateIds(data).filter((id) => {
      const dom = registry.get(id);
      if (!dom) return false;
      if (active.has(id)) return true;
      return isCollapsed(dom.getBoundingClientRect());
    }),
  );

/** Remove ghost styles from elements that are no longer collapsed. */
const restoreStale = (
  detected: Set<string>,
  registry: FiberRegistry,
  active: Map<string, SavedStyles>,
): void => {
  for (const [id, original] of active) {
    if (detected.has(id)) continue;
    const dom = registry.get(id);
    if (!dom) continue;
    applyStyles(dom, original);
    active.delete(id);
  }
};

/** Save originals and apply ghost styles to newly-detected components. */
const styleNewGhosts = (
  detected: Set<string>,
  registry: FiberRegistry,
  active: Map<string, SavedStyles>,
): void => {
  for (const id of detected) {
    if (active.has(id)) continue;
    const dom = registry.get(id);
    if (!dom) continue;
    active.set(id, saveStyles(dom));
    applyStyles(dom, GHOST_STYLES);
  }
};

/** Restore all saved originals. */
const restoreAll = (
  registry: FiberRegistry,
  active: Map<string, SavedStyles>,
): void => {
  for (const [id, original] of active) {
    const dom = registry.get(id);
    if (dom) applyStyles(dom, original);
  }
  active.clear();
};

// --- Hook ---

/**
 * Detect ghost components (empty containers with no visual footprint)
 * and apply inline styles so they're visible and clickable.
 *
 * Trade-off: we inject min-height, min-width, and a dashed outline directly
 * on the user's DOM element. This is intentional — overlay positioning can't
 * track an element we're simultaneously expanding from 0×0, and child injection
 * breaks grid/flex layouts. The inline styles are the least-invasive option
 * that reliably works. All styles are saved and restored on cleanup.
 */
export function useGhostPlaceholders(
  data: Data,
  registry: FiberRegistry | null,
): void {
  const savedRef = useRef(new Map<string, SavedStyles>());

  useEffect(() => {
    if (!registry) return;

    const active = savedRef.current;
    const detected = detectGhosts(data, registry, active);
    restoreStale(detected, registry, active);
    styleNewGhosts(detected, registry, active);

    return () => restoreAll(registry, active);
  }, [data, registry]);
}
