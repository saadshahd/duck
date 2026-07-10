/**
 * Button — a link-styled call-to-action atom (sp-64 §3.1: `label`, `href`,
 * `variant` primary·secondary·ghost).
 *
 * A navigation control, so it renders an `<a>` — honest to what it does (no form
 * submit here). `variant` is the only visual knob, a curated three-way that the
 * colocated CSS resolves against semantic tokens: primary fills with --primary,
 * secondary outlines on --border, ghost is chromeless accent text.
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./button.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps {
  label: string;
  href: string;
  variant: ButtonVariant;
}

export function Button({ label, href, variant }: ButtonProps) {
  return (
    <a className="almond-button" data-variant={variant} href={href}>
      {label}
    </a>
  );
}

export const buttonConfig: ComponentConfig<ButtonProps> = {
  fields: {
    label: { type: "text" },
    href: { type: "text" },
    variant: {
      type: "radio",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
        { label: "Ghost", value: "ghost" },
      ],
    },
  },
  defaultProps: { label: "Open an account", href: "#", variant: "primary" },
  render: ({ label, href, variant }) => (
    <Button label={label} href={href} variant={variant} />
  ),
};
