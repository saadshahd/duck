/**
 * FeatureGrid — a collection organism: benefit tiles in a responsive grid (sp-64 §3.3a).
 *
 * Composed by hand from the two shared primitives (no factory — DRY lives in the
 * primitives, sp-64 §3.3): `SectionShell` owns theming + rhythm, `CollectionGrid` owns
 * the layout-contract. No built-in heading — framing is an external `Section` placed
 * above (§3.3a). The homogeneous slot allows exactly one molecule type, `FeatureItem`
 * (§4 collection-slot rule).
 *
 * The slot renders its items straight into `CollectionGrid` as real children — via the
 * DropZone `as` wrapper — so the grid's `Children.count` sees the true item count and the
 * layout-contract holds at any n, including 0 (T3 rider). The wrapper is module-level so
 * its component identity is stable across renders.
 */

import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { ReactNode } from "react";
import { CollectionGrid } from "./collection-grid";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";

export interface FeatureGridProps {
  theme: ThemeName;
  items: Slot;
}

/** Bakes this organism's layout-contract; receives the slot items as its children. */
function FeatureGridBody({ children }: { children?: ReactNode }) {
  return (
    <CollectionGrid columns={{ base: 1, md: 3 }} degrade={{ rule: "balance" }}>
      {children}
    </CollectionGrid>
  );
}

export const featureGridConfig: ComponentConfig<FeatureGridProps> = {
  fields: {
    theme: themeField,
    items: { type: "slot", allow: ["FeatureItem"] },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    items: [
      {
        type: "FeatureItem",
        props: {
          icon: "◇",
          heading: "No hidden markup",
          text: "The price you see is the price you pay — every transfer, every time.",
        },
      },
      {
        type: "FeatureItem",
        props: {
          icon: "◈",
          heading: "Held in your name",
          text: "Your money is ring-fenced and never lent out.",
        },
      },
      {
        type: "FeatureItem",
        props: {
          icon: "◆",
          heading: "Paid daily",
          text: "Interest lands the next morning, not once a year.",
        },
      },
    ],
  },
  render: ({ theme, items: Items }) => (
    <SectionShell theme={theme}>
      <Items as={FeatureGridBody} />
    </SectionShell>
  ),
};
