/**
 * TestimonialSection — a collection organism: customer quotes grid (sp-64 §3.3a).
 *
 * Hand-composed from `SectionShell` + `CollectionGrid`. No built-in heading (§3.3a). The
 * slot allows exactly one molecule type, `Testimonial` (§4). Balance degrade avoids
 * orphan columns when fewer than three quotes are present.
 */

import type { ComponentConfig, Slot } from "@puckeditor/core";
import { densityBodies } from "./collection-grid";
import { DEFAULT_DENSITY, type Density, densityField } from "./density-field";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";

export interface TestimonialSectionProps {
  theme: ThemeName;
  density: Density;
  items: Slot;
}

/** The DS-authored per-density layout-contract bundles; compact packs the quotes tighter. */
const bodies = densityBodies({
  comfortable: { columns: { base: 1, md: 3 }, degrade: { rule: "balance" } },
  compact: { columns: { base: 2, md: 4 }, degrade: { rule: "balance" } },
});

export const testimonialSectionConfig: ComponentConfig<TestimonialSectionProps> =
  {
    fields: {
      theme: themeField,
      density: densityField,
      items: { type: "slot", allow: ["Testimonial"] },
    },
    defaultProps: {
      theme: DEFAULT_THEME,
      density: DEFAULT_DENSITY,
      items: [
        {
          type: "Testimonial",
          props: {
            quote: "I finally understand where my money goes.",
            author: "Priya N.",
            avatar: "",
          },
        },
        {
          type: "Testimonial",
          props: {
            quote: "Opening an account took less time than my coffee.",
            author: "Marcus T.",
            avatar: "",
          },
        },
        {
          type: "Testimonial",
          props: {
            quote: "The interest just shows up every morning.",
            author: "Lena K.",
            avatar: "",
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
