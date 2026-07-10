/**
 * StepItem — one numbered step for the StepsSection collection (sp-64 §3.2).
 *
 * The badge number is AUTO-INDEXED and the editor never sets an `n`: Puck renders
 * slot children with no sibling index, so the ordinal is produced at render by a CSS
 * `counter` (see step-item.css) — the number lives in no prop and no data. The host
 * StepsSection (T5) establishes `counter-reset: almond-step` on the list; each item
 * increments it. So reordering renumbers for free and there is nothing to keep honest.
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./step-item.css";

export interface StepItemProps {
  heading: string;
  text: string;
}

export function StepItem({ heading, text }: StepItemProps) {
  return (
    <div className="almond-step">
      <span className="almond-step__badge" aria-hidden="true" />
      <div className="almond-step__body">
        <h3 className="almond-step__heading">{heading}</h3>
        <p className="almond-step__text">{text}</p>
      </div>
    </div>
  );
}

export const stepItemConfig: ComponentConfig<StepItemProps> = {
  fields: {
    heading: { type: "text" },
    text: { type: "textarea" },
  },
  defaultProps: {
    heading: "Open your account",
    text: "It takes two minutes and a photo of your ID — no branch, no paperwork.",
  },
  render: ({ heading, text }) => <StepItem heading={heading} text={text} />,
};
