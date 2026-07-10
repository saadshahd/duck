/**
 * LogoItem — one partner mark for the LogoCloud collection (sp-64 §3.2).
 *
 * A leaf: an `image` source with an `alt`. With no image it falls back to the alt as a
 * quiet wordmark rather than a broken `<img>` (§2.7 media doctrine; empty state in T12),
 * so a logo cloud degrades to legible text instead of gaps.
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./logo-item.css";

export interface LogoItemProps {
  image: string;
  alt: string;
}

export function LogoItem({ image, alt }: LogoItemProps) {
  return (
    <span className="almond-logo">
      {image ? (
        <img src={image} alt={alt} />
      ) : (
        <span className="almond-logo__wordmark">{alt}</span>
      )}
    </span>
  );
}

export const logoItemConfig: ComponentConfig<LogoItemProps> = {
  fields: {
    image: { type: "text" },
    alt: { type: "text" },
  },
  defaultProps: { image: "", alt: "Acme" },
  render: ({ image, alt }) => <LogoItem image={image} alt={alt} />,
};
