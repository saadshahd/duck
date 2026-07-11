/**
 * StatBand — a collection organism: headline numbers in a responsive grid (sp-64 §3.3a).
 *
 * Hand-composed from `SectionShell` (theming + rhythm) + `CollectionGrid` (layout-
 * contract). No built-in heading — framing is an external `Section` above (§3.3a). The
 * slot allows exactly one molecule type, `StatItem` (§4). Items render straight into the
 * grid as real children via the DropZone `as` wrapper, so the contract holds at any n.
 */

import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { ReactNode } from "react";
import { CollectionGrid } from "./collection-grid";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";

export interface StatBandProps {
  theme: ThemeName;
  items: Slot;
}

function StatBandBody({ children }: { children?: ReactNode }) {
  return (
    <CollectionGrid columns={{ base: 1, md: 3 }} degrade={{ rule: "balance" }}>
      {children}
    </CollectionGrid>
  );
}

export const statBandConfig: ComponentConfig<StatBandProps> = {
  fields: {
    theme: themeField,
    items: { type: "slot", allow: ["StatItem"] },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    items: [
      { type: "StatItem", props: { value: "0", label: "hidden fees" } },
      { type: "StatItem", props: { value: "4.1%", label: "AER, paid daily" } },
      {
        type: "StatItem",
        props: { value: "2 min", label: "to open an account" },
      },
    ],
  },
  render: ({ theme, items: Items }) => (
    <SectionShell theme={theme}>
      <Items as={StatBandBody} />
    </SectionShell>
  ),
};
