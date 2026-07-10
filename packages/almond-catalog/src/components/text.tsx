/**
 * Text — a plain body paragraph atom (sp-64 §3.1: `text`).
 *
 * The most primitive content leaf: one string, no variants. Renders a `<p>` whose
 * measure and rhythm are DS-fixed in the colocated CSS via semantic tokens; the
 * only knob is the copy itself. Inter-child spacing is the free `Section` host's
 * job (T6), never the atom's — so no margins that reach outside the element.
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./text.css";

export interface TextProps {
  text: string;
}

export function Text({ text }: TextProps) {
  return <p className="almond-text">{text}</p>;
}

export const textConfig: ComponentConfig<TextProps> = {
  fields: {
    text: { type: "textarea" },
  },
  defaultProps: {
    text: "Almond keeps the boring parts of money quiet, so you can get on with your day.",
  },
  render: ({ text }) => <Text text={text} />,
};
