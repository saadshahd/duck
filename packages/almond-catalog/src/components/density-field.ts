/**
 * densityField — the `density` quick-variant every collection organism carries (sp-64 §5.1, §5.3).
 *
 * A binary presentational morph — `comfortable | compact` — answering "how tightly do grid
 * items pack?". Crucially NOT a column number: each value names a DS-authored whole-contract
 * `{ columns, degrade }` bundle the organism resolves through `densityBodies` (./collection-grid),
 * so the editor SELECTS between DS-fixed contracts and never authors geometry (§5.3 B2).
 *
 * Shared across all 8 collection organisms — DRY at the field level, mirroring `themeField`.
 * Presentational, so morphable by default (§5.4): the engine surfaces it in the picker with
 * no flag. `radio` matches the catalog convention for a small curated toggle (Button.variant).
 */

import type { Field } from "@puckeditor/core";

export const DENSITIES = ["comfortable", "compact"] as const;
export type Density = (typeof DENSITIES)[number];
export const DEFAULT_DENSITY: Density = "comfortable";

export const densityField: Field<Density> = {
  type: "radio",
  options: [
    { label: "Comfortable", value: "comfortable" },
    { label: "Compact", value: "compact" },
  ],
};
