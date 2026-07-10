/**
 * Prose — a rich-text block atom (sp-64 §3.1: `body`, richtext / Tiptap).
 *
 * `body` is an HTML string — Duck's richtext contract (a plain-string field tagged
 * `metadata.control: "richtext"`; the editor's focus-sheet drives Tiptap, the
 * catalog only renders the stored HTML). So the atom carries NO tiptap dependency:
 * it dangerously-sets the string and lets the colocated CSS theme the flow content
 * (paragraphs, lists, emphasis, links) from semantic tokens.
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./prose.css";

export interface ProseProps {
  body: string;
}

export function Prose({ body }: ProseProps) {
  return (
    <div className="almond-prose" dangerouslySetInnerHTML={{ __html: body }} />
  );
}

export const proseConfig: ComponentConfig<ProseProps> = {
  fields: {
    body: {
      type: "textarea",
      metadata: {
        control: "richtext",
        tiptap: { placeholder: "Write a paragraph…" },
      },
    },
  },
  defaultProps: {
    body: "<p>Money you keep, quietly. <strong>No hidden markup</strong>, no surprises — just the boring parts of money, finally solved.</p>",
  },
  render: ({ body }) => <Prose body={body} />,
};
