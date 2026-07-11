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
import type { ReactNode } from "react";
import { CollectionGrid } from "./collection-grid";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";

export interface ProductShowcaseProps {
  theme: ThemeName;
  items: Slot;
}

function ProductShowcaseBody({ children }: { children?: ReactNode }) {
  return (
    <CollectionGrid columns={{ base: 1, md: 3 }} degrade={{ rule: "balance" }}>
      {children}
    </CollectionGrid>
  );
}

export const productShowcaseConfig: ComponentConfig<ProductShowcaseProps> = {
  fields: {
    theme: themeField,
    items: { type: "slot", allow: ["ProductSummary"] },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    items: [
      { type: "ProductSummary", props: { productId: "everyday" } },
      { type: "ProductSummary", props: { productId: "interest" } },
      { type: "ProductSummary", props: { productId: "send" } },
    ],
  },
  render: ({ theme, items: Items }) => (
    <SectionShell theme={theme}>
      <Items as={ProductShowcaseBody} />
    </SectionShell>
  ),
};
