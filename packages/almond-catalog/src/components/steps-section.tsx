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
import type { ReactNode } from "react";
import { CollectionGrid } from "./collection-grid";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";
import "./steps-section.css";

export interface StepsSectionProps {
  theme: ThemeName;
  items: Slot;
}

function StepsSectionBody({ children }: { children?: ReactNode }) {
  return (
    <div className="almond-steps">
      <CollectionGrid columns={{ base: 1, md: 4 }} degrade={{ rule: "reflow" }}>
        {children}
      </CollectionGrid>
    </div>
  );
}

export const stepsSectionConfig: ComponentConfig<StepsSectionProps> = {
  fields: {
    theme: themeField,
    items: { type: "slot", allow: ["StepItem"] },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
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
  render: ({ theme, items: Items }) => (
    <SectionShell theme={theme}>
      <Items as={StepsSectionBody} />
    </SectionShell>
  ),
};
