/**
 * Section — the universal framing/composition host (sp-64 §3.3b, §4).
 *
 * The one organism with a free, heterogeneous `body` slot: it allows the curated atom set
 * plus the free-placeable molecules and widgets (§4). It OWNS inter-child rhythm — atoms
 * carry no outer margins (T2), so the vertical gap between a Heading and the Text below it
 * is this host's concern, applied on the body wrapper. Carries the uniform `theme` (§5.1)
 * and paints through `SectionShell`.
 *
 * This is also the only Pattern-bearing organism — the named Pattern drop-palette (§5.2)
 * attaches to this slot in T10; here the slot is the plain free host those Patterns drop
 * into. The slot reaches its rhythm wrapper as real children via the DropZone `as` contract
 * (module-level for stable identity), matching every other slotted organism.
 */

import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { ReactNode } from "react";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";
import "./section.css";

export interface SectionProps {
  theme: ThemeName;
  body: Slot;
}

/** Owns inter-child rhythm for the free body slot; receives slot items as children. */
function SectionBody({ children }: { children?: ReactNode }) {
  return <div className="almond-section-body">{children}</div>;
}

export const sectionConfig: ComponentConfig<SectionProps> = {
  fields: {
    theme: themeField,
    body: {
      type: "slot",
      allow: [
        "Heading",
        "Text",
        "Prose",
        "Button",
        "Image",
        "Divider",
        "AppStoreBadges",
        "ProductSummary",
        "RateWidget",
        "ComparisonTable",
      ],
    },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    body: [
      {
        type: "Heading",
        props: { text: "Built to be boring with your money.", level: 2 },
      },
      {
        type: "Text",
        props: {
          text: "No trading gimmicks, no surprise fees — just the everyday money tools you'd expect, done plainly.",
        },
      },
    ],
  },
  render: ({ theme, body: Body }) => (
    <SectionShell theme={theme}>
      <Body as={SectionBody} />
    </SectionShell>
  ),
};
