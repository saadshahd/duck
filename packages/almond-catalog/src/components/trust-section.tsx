/**
 * TrustSection — a collection organism: certifications/badges grid (sp-64 §3.3a).
 *
 * Hand-composed from `SectionShell` + `CollectionGrid`. No built-in heading (§3.3a). The
 * slot allows exactly one molecule type, `Certification` (§4). Reflow degrade wraps the
 * dense 2/4-column band at any count.
 */

import type { ComponentConfig, Slot } from "@puckeditor/core";
import { densityBodies } from "./collection-grid";
import { DEFAULT_DENSITY, type Density, densityField } from "./density-field";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";

export interface TrustSectionProps {
  theme: ThemeName;
  density: Density;
  items: Slot;
}

/** The DS-authored per-density layout-contract bundles; compact packs the badges tighter. */
const bodies = densityBodies({
  comfortable: { columns: { base: 2, md: 4 }, degrade: { rule: "reflow" } },
  compact: { columns: { base: 3, md: 6 }, degrade: { rule: "reflow" } },
});

export const trustSectionConfig: ComponentConfig<TrustSectionProps> = {
  fields: {
    theme: themeField,
    density: densityField,
    items: { type: "slot", allow: ["Certification"] },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    density: DEFAULT_DENSITY,
    items: [
      { type: "Certification", props: { icon: "🛡", label: "FSCS protected" } },
      {
        type: "Certification",
        props: { icon: "🔒", label: "256-bit encryption" },
      },
      { type: "Certification", props: { icon: "✅", label: "FCA regulated" } },
      {
        type: "Certification",
        props: { icon: "🏛", label: "Ring-fenced deposits" },
      },
    ],
  },
  render: ({ theme, density, items: Items }) => (
    <SectionShell theme={theme}>
      <Items as={bodies[density] ?? bodies[DEFAULT_DENSITY]} />
    </SectionShell>
  ),
};
