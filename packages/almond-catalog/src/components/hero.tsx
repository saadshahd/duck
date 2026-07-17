/**
 * Hero — a field/free-host organism: the page-opening statement (sp-64 §3.3b).
 *
 * Content lives in fields (`eyebrow`, `headline`, `subhead`, `media`); the call-to-action
 * lives in a FREE slot `actions` that allows a curated set — `Button`, `AppStoreBadges`,
 * `RateWidget` (§4). Carries the uniform `theme` (§5.1) and paints through the shared
 * `SectionShell`, so it themes and anchors its morph picker like every other organism.
 *
 * Optional copy is empty-by-absence: an empty `eyebrow`/`subhead` renders nothing rather
 * than an empty node. `media` reuses the `Image` atom's DS-owned frame (§2.7) — an empty
 * `src` yields a text-only hero, never a broken raster. The `actions` slot reaches its
 * rhythm wrapper as real children via the DropZone `as` contract (module-level so the
 * wrapper identity is stable), matching the collection-organism pattern.
 */

import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { ReactNode } from "react";
import { Image } from "./image";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";
import "./hero.css";

export interface HeroMedia {
  src: string;
  alt: string;
}

export interface HeroProps {
  theme: ThemeName;
  eyebrow: string;
  headline: string;
  subhead: string;
  media: HeroMedia;
  actions: Slot;
}

/** Lays out the free `actions` slot as a wrapping action row; receives slot items as children. */
function HeroActions({ children }: { children?: ReactNode }) {
  return <div className="almond-hero__actions">{children}</div>;
}

export const heroConfig: ComponentConfig<HeroProps> = {
  fields: {
    theme: themeField,
    eyebrow: { type: "text" },
    headline: { type: "text" },
    subhead: { type: "textarea" },
    media: {
      type: "object",
      objectFields: {
        src: { type: "text" },
        alt: { type: "text" },
      },
    },
    actions: {
      type: "slot",
      allow: ["Button", "AppStoreBadges", "RateWidget"],
    },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    eyebrow: "Cross-border money",
    headline: "Money you keep, quietly.",
    subhead:
      "Hold, send and grow your money across borders — at the real rate, with nothing hidden.",
    media: { src: "", alt: "" },
    actions: [
      {
        type: "Button",
        props: { label: "Open an account", href: "#", variant: "primary" },
      },
      {
        type: "Button",
        props: { label: "See how it works", href: "#", variant: "ghost" },
      },
    ],
  },
  render: ({ theme, eyebrow, headline, subhead, media, actions: Actions }) => (
    <SectionShell theme={theme}>
      <div className="almond-hero">
        <div className="almond-hero__copy">
          {eyebrow ? <p className="almond-hero__eyebrow">{eyebrow}</p> : null}
          <h1 className="almond-hero__headline">{headline}</h1>
          {subhead ? <p className="almond-hero__subhead">{subhead}</p> : null}
          <Actions as={HeroActions} />
        </div>
        {media.src ? (
          <div className="almond-hero__media">
            <Image src={media.src} alt={media.alt} ratio="landscape" />
          </div>
        ) : null}
      </div>
    </SectionShell>
  ),
};
