/**
 * LogoCloud — a collection organism: partner/press marks in a reflow grid (sp-64 §3.3a).
 *
 * Hand-composed from `SectionShell` + `CollectionGrid`. No built-in heading (§3.3a). The
 * slot allows exactly one molecule type, `LogoItem` (§4). Reflow degrade keeps the dense
 * 2/6-column rhythm and simply wraps overflow. Contract lists a muted/monochrome logo
 * treatment — deferred to the Fog visual-tuning pass with real logo assets (§3.3a rider).
 */

import type { ComponentConfig, Slot } from "@puckeditor/core";
import { densityBodies } from "./collection-grid";
import { DEFAULT_DENSITY, type Density, densityField } from "./density-field";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";

export interface LogoCloudProps {
  theme: ThemeName;
  density: Density;
  items: Slot;
}

/** The DS-authored per-density layout-contract bundles; compact packs the marks tighter. */
const bodies = densityBodies({
  comfortable: { columns: { base: 2, md: 6 }, degrade: { rule: "reflow" } },
  compact: { columns: { base: 3, md: 8 }, degrade: { rule: "reflow" } },
});

export const logoCloudConfig: ComponentConfig<LogoCloudProps> = {
  fields: {
    theme: themeField,
    density: densityField,
    items: { type: "slot", allow: ["LogoItem"] },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    density: DEFAULT_DENSITY,
    items: [
      { type: "LogoItem", props: { image: "", alt: "Acme" } },
      { type: "LogoItem", props: { image: "", alt: "Globex" } },
      { type: "LogoItem", props: { image: "", alt: "Initech" } },
      { type: "LogoItem", props: { image: "", alt: "Umbrella" } },
      { type: "LogoItem", props: { image: "", alt: "Hooli" } },
      { type: "LogoItem", props: { image: "", alt: "Vandelay" } },
    ],
  },
  render: ({ theme, density, items: Items }) => (
    <SectionShell theme={theme}>
      <Items as={bodies[density] ?? bodies[DEFAULT_DENSITY]} />
    </SectionShell>
  ),
};
