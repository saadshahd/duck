import { useContext, useEffect } from "react";
import { ShadowContext } from "./shadow-context.js";

/**
 * Register a CSSStyleSheet into the nearest shadow root.
 * Sheet is added on first mount and removed when the last consumer unmounts.
 * Ref-counted so multiple components in the same domain can each call this
 * with the same CSS string without duplicating sheets.
 *
 * Why not react-shadow's built-in style injection: we need per-domain
 * mount/unmount lifecycle so sheets are added and removed dynamically
 * based on which domains are currently rendered.
 */

type SheetEntry = { sheet: CSSStyleSheet; refs: number };
const registry = new WeakMap<ShadowRoot, Map<string, SheetEntry>>();

function getEntries(shadow: ShadowRoot): Map<string, SheetEntry> {
  let entries = registry.get(shadow);
  if (!entries) {
    entries = new Map();
    registry.set(shadow, entries);
  }
  return entries;
}

export function useShadowSheet(css: string): void {
  const shadow = useContext(ShadowContext);

  useEffect(() => {
    if (!shadow) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "useShadowSheet: no ShadowRoot found — is this component inside <OverlayRoot>?",
        );
      }
      return;
    }

    const entries = getEntries(shadow);
    const existing = entries.get(css);

    if (existing) {
      existing.refs++;
    } else {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
      entries.set(css, { sheet, refs: 1 });
    }

    return () => {
      const entry = entries.get(css);
      if (!entry) return;

      entry.refs--;
      if (entry.refs === 0) {
        shadow.adoptedStyleSheets = shadow.adoptedStyleSheets.filter(
          (s) => s !== entry.sheet,
        );
        entries.delete(css);
      }
    };
  }, [shadow, css]);
}
