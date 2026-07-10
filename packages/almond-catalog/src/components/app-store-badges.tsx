/**
 * AppStoreBadges — the app-store link pair (sp-64 §3.2), free-placeable in Hero /
 * Section / CTABand slots.
 *
 * A leaf: two store hrefs. Rendered as themed text pills, not the official raster
 * badges (§2.7 media doctrine forbids DS-shipped raster) — the wordmark carries the
 * store name so the pair reskins with the section rather than clashing with it.
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./app-store-badges.css";

export interface AppStoreBadgesProps {
  appStoreHref: string;
  playStoreHref: string;
}

export function AppStoreBadges({
  appStoreHref,
  playStoreHref,
}: AppStoreBadgesProps) {
  return (
    <div className="almond-badges">
      <a className="almond-badge" href={appStoreHref}>
        <span className="almond-badge__glyph" aria-hidden="true">
          ⬇
        </span>
        <span className="almond-badge__labels">
          <small>Download on the</small>
          <strong>App Store</strong>
        </span>
      </a>
      <a className="almond-badge" href={playStoreHref}>
        <span className="almond-badge__glyph" aria-hidden="true">
          ▶
        </span>
        <span className="almond-badge__labels">
          <small>Get it on</small>
          <strong>Google Play</strong>
        </span>
      </a>
    </div>
  );
}

export const appStoreBadgesConfig: ComponentConfig<AppStoreBadgesProps> = {
  fields: {
    appStoreHref: { type: "text" },
    playStoreHref: { type: "text" },
  },
  defaultProps: { appStoreHref: "#", playStoreHref: "#" },
  render: ({ appStoreHref, playStoreHref }) => (
    <AppStoreBadges appStoreHref={appStoreHref} playStoreHref={playStoreHref} />
  ),
};
