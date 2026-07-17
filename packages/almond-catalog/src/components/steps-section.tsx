/**
 * StepsSection — a collection organism: an ordered "how it works" sequence (sp-64 §3.3a).
 *
 * Hand-composed from `SectionShell` + `CollectionGrid`. No built-in heading (§3.3a). The
 * slot allows exactly one molecule type, `StepItem` (§4). This organism owns the
 * `counter-reset: almond-step` the StepItem badges increment (T4 rider) — set on the body
 * wrapper, an ancestor of every step, so the CSS-counter numbering is sequential in DOM
 * order and reorder-safe. Reflow degrade keeps the declared columns and wraps overflow.
 */

import type { ComponentConfig, Slot } from "@puckeditor/core";
import { densityBodies } from "./collection-grid";
import { DEFAULT_DENSITY, type Density, densityField } from "./density-field";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";
import "./steps-section.css";

export interface StepsSectionProps {
  theme: ThemeName;
  density: Density;
  items: Slot;
}

/** The DS-authored per-density layout-contract bundles; compact packs the steps tighter.
 *  Both wrap the grid in `.almond-steps` — the `counter-reset` ancestor for the badges. */
const bodies = densityBodies(
  {
    comfortable: { columns: { base: 1, md: 4 }, degrade: { rule: "reflow" } },
    compact: { columns: { base: 2, md: 4 }, degrade: { rule: "reflow" } },
  },
  "almond-steps",
);

export const stepsSectionConfig: ComponentConfig<StepsSectionProps> = {
  fields: {
    theme: themeField,
    density: densityField,
    items: { type: "slot", allow: ["StepItem"] },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    density: DEFAULT_DENSITY,
    items: [
      {
        type: "StepItem",
        props: {
          heading: "Open your account",
          text: "Two minutes and a photo of your ID — no branch, no paperwork.",
        },
      },
      {
        type: "StepItem",
        props: {
          heading: "Add your money",
          text: "Move funds in by bank transfer or debit card.",
        },
      },
      {
        type: "StepItem",
        props: {
          heading: "Start earning",
          text: "Interest lands the next morning and every day after.",
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
