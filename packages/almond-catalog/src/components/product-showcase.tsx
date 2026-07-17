/**
 * ProductShowcase — a collection organism: the shared-reference product beat (sp-64 §3.3a).
 *
 * Hand-composed from `SectionShell` + `CollectionGrid`. No built-in heading (§3.3a). The
 * slot allows exactly one molecule type, `ProductSummary` (§4) — the sole consumer of the
 * compliance-owned `products.ts` reference. Balance degrade avoids orphan columns with
 * one or two products. ProductSummary's `presentation` morph is promoted to a field in T9;
 * here each card uses its default full-card path.
 */

import type { ComponentConfig, Slot } from "@puckeditor/core";
import { densityBodies } from "./collection-grid";
import { DEFAULT_DENSITY, type Density, densityField } from "./density-field";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";

export interface ProductShowcaseProps {
  theme: ThemeName;
  density: Density;
  items: Slot;
}

/** The DS-authored per-density layout-contract bundles; compact packs the products tighter. */
const bodies = densityBodies({
  comfortable: { columns: { base: 1, md: 3 }, degrade: { rule: "balance" } },
  compact: { columns: { base: 2, md: 4 }, degrade: { rule: "balance" } },
});

export const productShowcaseConfig: ComponentConfig<ProductShowcaseProps> = {
  fields: {
    theme: themeField,
    density: densityField,
    items: { type: "slot", allow: ["ProductSummary"] },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    density: DEFAULT_DENSITY,
    items: [
      { type: "ProductSummary", props: { productId: "everyday" } },
      { type: "ProductSummary", props: { productId: "interest" } },
      { type: "ProductSummary", props: { productId: "send" } },
    ],
  },
  render: ({ theme, density, items: Items }) => (
    <SectionShell theme={theme}>
      <Items as={bodies[density] ?? bodies[DEFAULT_DENSITY]} />
    </SectionShell>
  ),
};
