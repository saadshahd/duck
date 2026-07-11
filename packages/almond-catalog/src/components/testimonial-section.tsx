/**
 * TestimonialSection — a collection organism: customer quotes grid (sp-64 §3.3a).
 *
 * Hand-composed from `SectionShell` + `CollectionGrid`. No built-in heading (§3.3a). The
 * slot allows exactly one molecule type, `Testimonial` (§4). Balance degrade avoids
 * orphan columns when fewer than three quotes are present.
 */

import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { ReactNode } from "react";
import { CollectionGrid } from "./collection-grid";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";

export interface TestimonialSectionProps {
  theme: ThemeName;
  items: Slot;
}

function TestimonialSectionBody({ children }: { children?: ReactNode }) {
  return (
    <CollectionGrid columns={{ base: 1, md: 3 }} degrade={{ rule: "balance" }}>
      {children}
    </CollectionGrid>
  );
}

export const testimonialSectionConfig: ComponentConfig<TestimonialSectionProps> =
  {
    fields: {
      theme: themeField,
      items: { type: "slot", allow: ["Testimonial"] },
    },
    defaultProps: {
      theme: DEFAULT_THEME,
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
    render: ({ theme, items: Items }) => (
      <SectionShell theme={theme}>
        <Items as={TestimonialSectionBody} />
      </SectionShell>
    ),
  };
