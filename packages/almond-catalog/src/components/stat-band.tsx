/**
 * StatBand — a collection organism: headline numbers in a responsive grid (sp-64 §3.3a).
 *
 * Hand-composed from `SectionShell` (theming + rhythm) + `CollectionGrid` (layout-
 * contract). No built-in heading — framing is an external `Section` above (§3.3a). The
 * slot allows exactly one molecule type, `StatItem` (§4). Items render straight into the
 * grid as real children via the DropZone `as` wrapper, so the contract holds at any n.
 */

import type { ComponentConfig, Slot } from "@puckeditor/core";
import { densityBodies } from "./collection-grid";
import { DEFAULT_DENSITY, type Density, densityField } from "./density-field";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";

export interface StatBandProps {
  theme: ThemeName;
  density: Density;
  items: Slot;
}

/** The DS-authored per-density layout-contract bundles; compact packs items more tightly. */
const bodies = densityBodies({
  comfortable: { columns: { base: 1, md: 3 }, degrade: { rule: "balance" } },
  compact: { columns: { base: 2, md: 6 }, degrade: { rule: "balance" } },
});

export const statBandConfig: ComponentConfig<StatBandProps> = {
  fields: {
    theme: themeField,
    density: densityField,
    items: { type: "slot", allow: ["StatItem"] },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    density: DEFAULT_DENSITY,
    items: [
      { type: "StatItem", props: { value: "0", label: "hidden fees" } },
      { type: "StatItem", props: { value: "4.1%", label: "AER, paid daily" } },
      {
        type: "StatItem",
        props: { value: "2 min", label: "to open an account" },
      },
    ],
  },
  render: ({ theme, density, items: Items }) => (
    <SectionShell theme={theme}>
      <Items as={bodies[density] ?? bodies[DEFAULT_DENSITY]} />
    </SectionShell>
  ),
};
