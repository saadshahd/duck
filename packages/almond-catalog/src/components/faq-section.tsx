/**
 * FAQSection — a collection organism: a single-column stack of Q&A rows (sp-64 §3.3a).
 *
 * Hand-composed from `SectionShell` + `CollectionGrid`. No built-in heading (§3.3a). The
 * slot allows exactly one molecule type, `FaqItem` (§4). Single-column reflow — the
 * accordion affordance noted in the contract is an FaqItem-level refinement (Fog), not a
 * layout concern here.
 */

import type { ComponentConfig, Slot } from "@puckeditor/core";
import { densityBodies } from "./collection-grid";
import { DEFAULT_DENSITY, type Density, densityField } from "./density-field";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";

export interface FaqSectionProps {
  theme: ThemeName;
  density: Density;
  items: Slot;
}

/** The DS-authored per-density layout-contract bundles; compact pairs Q&A into two columns. */
const bodies = densityBodies({
  comfortable: { columns: { base: 1 }, degrade: { rule: "reflow" } },
  compact: { columns: { base: 1, md: 2 }, degrade: { rule: "reflow" } },
});

export const faqSectionConfig: ComponentConfig<FaqSectionProps> = {
  fields: {
    theme: themeField,
    density: densityField,
    items: { type: "slot", allow: ["FaqItem"] },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    density: DEFAULT_DENSITY,
    items: [
      {
        type: "FaqItem",
        props: {
          question: "Is my money safe with Almond?",
          answer:
            "<p>Yes — eligible deposits are protected up to <strong>£85,000</strong> by the FSCS.</p>",
        },
      },
      {
        type: "FaqItem",
        props: {
          question: "How is interest paid?",
          answer:
            "<p>Interest is calculated daily and paid into your account every morning.</p>",
        },
      },
      {
        type: "FaqItem",
        props: {
          question: "Are there any fees?",
          answer:
            "<p>No monthly fees and no hidden markup — you keep what's yours.</p>",
        },
      },
    ],
  },
  render: ({ theme, density, items: Items }) => (
    <SectionShell theme={theme}>
      <Items as={bodies[density] ?? bodies[DEFAULT_DENSITY]} />
    </SectionShell>
  ),
};
