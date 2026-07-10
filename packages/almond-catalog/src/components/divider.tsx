/**
 * Divider — a rule-line atom (sp-64 §3.1: `variant?`, hairline).
 *
 * The lightest content leaf. `variant` is optional and curated to the single
 * `hairline` today — the frozen contract reserves the field so future rule weights
 * slot in without a shape change. Renders a semantic `<hr>`; the colocated CSS
 * draws the line from `--hairline`.
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./divider.css";

export type DividerVariant = "hairline";

export interface DividerProps {
  variant?: DividerVariant;
}

export function Divider({ variant = "hairline" }: DividerProps) {
  return <hr className="almond-divider" data-variant={variant} />;
}

export const dividerConfig: ComponentConfig<DividerProps> = {
  fields: {
    variant: {
      type: "select",
      options: [{ label: "Hairline", value: "hairline" }],
    },
  },
  defaultProps: { variant: "hairline" },
  render: ({ variant }) => <Divider variant={variant} />,
};
