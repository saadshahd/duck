/**
 * FeatureItem — a benefit tile for the FeatureGrid collection (sp-64 §3.2).
 *
 * A leaf (no slots): icon + heading + supporting text. `icon` is a short glyph
 * string, never a raster (§2.7 media doctrine). Themed purely from ambient tokens
 * via the colocated CSS, so it reskins with its section's `data-theme`.
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./feature-item.css";

export interface FeatureItemProps {
  icon: string;
  heading: string;
  text: string;
}

export function FeatureItem({ icon, heading, text }: FeatureItemProps) {
  return (
    <div className="almond-feature">
      {icon ? (
        <span className="almond-feature__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <h3 className="almond-feature__heading">{heading}</h3>
      <p className="almond-feature__text">{text}</p>
    </div>
  );
}

export const featureItemConfig: ComponentConfig<FeatureItemProps> = {
  fields: {
    icon: { type: "text" },
    heading: { type: "text" },
    text: { type: "textarea" },
  },
  defaultProps: {
    icon: "◇",
    heading: "No hidden markup",
    text: "The price you see is the price you pay — every transfer, every time.",
  },
  render: ({ icon, heading, text }) => (
    <FeatureItem icon={icon} heading={heading} text={text} />
  ),
};
