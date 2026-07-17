/**
 * CTABand — a field/free-host organism: the closing call-to-action strip (sp-64 §3.3b).
 *
 * Fields carry the copy (`headline`, optional `subhead`); the free `actions` slot allows a
 * curated pair — `Button`, `AppStoreBadges` (§4). Carries the uniform `theme` (§5.1) and
 * paints through `SectionShell`.
 *
 * TWO render paths behind the `format` morph — `band` (a compact inline strip) and
 * `interstitial` (a full-bleed centred break). Both are built here; the `format` field
 * itself is promoted into the Puck contract in T9 (mirrors RateWidget's `mode` /
 * ProductSummary's `presentation` — a view param today so both paths exist and are testable
 * before the morph wiring lands). The rendered `actions` slot is passed in as children so
 * the view stays decoupled from Puck's Slot component type.
 */

import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { ReactNode } from "react";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";
import "./cta-band.css";

export type CTAFormat = "band" | "interstitial";

export interface CTABandProps {
  theme: ThemeName;
  headline: string;
  subhead: string;
  actions: Slot;
}

interface CTABandViewProps {
  theme: ThemeName;
  headline: string;
  subhead: string;
  actions: ReactNode;
  format?: CTAFormat;
}

/** Lays out the free `actions` slot as a wrapping action row; receives slot items as children. */
function CTABandActions({ children }: { children?: ReactNode }) {
  return <div className="almond-cta__actions">{children}</div>;
}

export function CTABand({
  theme,
  headline,
  subhead,
  actions,
  format = "band",
}: CTABandViewProps) {
  return (
    <SectionShell theme={theme}>
      <div className="almond-cta" data-format={format}>
        <div className="almond-cta__copy">
          <h2 className="almond-cta__headline">{headline}</h2>
          {subhead ? <p className="almond-cta__subhead">{subhead}</p> : null}
        </div>
        {actions}
      </div>
    </SectionShell>
  );
}

export const ctaBandConfig: ComponentConfig<CTABandProps> = {
  fields: {
    theme: themeField,
    headline: { type: "text" },
    subhead: { type: "textarea" },
    actions: {
      type: "slot",
      allow: ["Button", "AppStoreBadges"],
    },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    headline: "Ready to keep more of your money?",
    subhead: "Open an Almond account in minutes — no fees to start.",
    actions: [
      {
        type: "Button",
        props: { label: "Open an account", href: "#", variant: "primary" },
      },
    ],
  },
  render: ({ theme, headline, subhead, actions: Actions }) => (
    <CTABand
      theme={theme}
      headline={headline}
      subhead={subhead}
      actions={<Actions as={CTABandActions} />}
    />
  ),
};
