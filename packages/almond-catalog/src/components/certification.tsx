/**
 * Certification — one trust marker for the TrustSection collection (sp-64 §3.2).
 *
 * A leaf: a glyph plus a short label ("FSCS protected", "256-bit encryption"). `icon`
 * is a glyph string, never a raster (§2.7). Reads as a quiet chip, themed from tokens.
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./certification.css";

export interface CertificationProps {
  icon: string;
  label: string;
}

export function Certification({ icon, label }: CertificationProps) {
  return (
    <div className="almond-cert">
      {icon ? (
        <span className="almond-cert__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="almond-cert__label">{label}</span>
    </div>
  );
}

export const certificationConfig: ComponentConfig<CertificationProps> = {
  fields: {
    icon: { type: "text" },
    label: { type: "text" },
  },
  defaultProps: { icon: "🛡", label: "FSCS protected up to £85,000" },
  render: ({ icon, label }) => <Certification icon={icon} label={label} />,
};
