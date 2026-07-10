/**
 * FaqItem — one question/answer pair for the FAQSection collection (sp-64 §3.2).
 *
 * A leaf: a plain-text `question` and a richtext `answer`. The answer is an HTML string
 * (Duck's richtext contract, tagged `metadata.control: "richtext"`) rendered with
 * `dangerouslySetInnerHTML` — the same pattern as the Prose atom, carrying no Tiptap
 * dependency; the editor's focus-sheet drives the editing surface.
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./faq-item.css";

export interface FaqItemProps {
  question: string;
  answer: string;
}

export function FaqItem({ question, answer }: FaqItemProps) {
  return (
    <div className="almond-faq">
      <h3 className="almond-faq__question">{question}</h3>
      <div
        className="almond-faq__answer"
        dangerouslySetInnerHTML={{ __html: answer }}
      />
    </div>
  );
}

export const faqItemConfig: ComponentConfig<FaqItemProps> = {
  fields: {
    question: { type: "text" },
    answer: {
      type: "textarea",
      metadata: {
        control: "richtext",
        tiptap: { placeholder: "Answer the question…" },
      },
    },
  },
  defaultProps: {
    question: "Is my money safe with Almond?",
    answer:
      "<p>Yes. Eligible deposits are protected up to <strong>£85,000</strong> by the FSCS, and your money is held in your name — never lent out.</p>",
  },
  render: ({ question, answer }) => (
    <FaqItem question={question} answer={answer} />
  ),
};
