/**
 * Heading — the T1 proof atom (sp-64 §3.1: `text`, `level` 1–4).
 *
 * Content + curated variant props, NO raw style: the only visual knob is the
 * semantic `level`, which selects a size step. Renders the matching `h{level}`
 * element so the DOM stays honest. Styling lives in the colocated CSS, which
 * references semantic tokens only — the render re-themes purely from the ambient
 * `data-theme` / `.mode-dark` context.
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./heading.css";

export type HeadingLevel = 1 | 2 | 3 | 4;

export interface HeadingProps {
  text: string;
  level: HeadingLevel;
}

export function Heading({ text, level }: HeadingProps) {
  const Tag = `h${level}` as `h${HeadingLevel}`;
  return (
    <Tag className="almond-heading" data-level={level}>
      {text}
    </Tag>
  );
}

export const headingConfig: ComponentConfig<HeadingProps> = {
  fields: {
    text: { type: "text" },
    level: {
      type: "select",
      options: [1, 2, 3, 4].map((n) => ({ label: `H${n}`, value: n })),
    },
  },
  defaultProps: { text: "Money you keep, quietly.", level: 2 },
  render: ({ text, level }) => <Heading text={text} level={level} />,
};
