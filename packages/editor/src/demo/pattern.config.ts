import type { PatternConfig } from "@duck/patterns";
import type { ComponentData } from "@puckeditor/core";

const h = (id: string, text: string): ComponentData =>
  ({
    type: "Heading",
    props: { id, text, level: "h2", style: {} },
  }) as unknown as ComponentData;
const t = (id: string, text: string): ComponentData =>
  ({
    type: "Text",
    props: { id, text, style: {} },
  }) as unknown as ComponentData;
const btn = (id: string, label: string): ComponentData =>
  ({
    type: "Button",
    props: { id, label, variant: "primary" },
  }) as unknown as ComponentData;

export const patternConfig: PatternConfig = {
  componentRoles: {
    Stack: "container",
    Heading: "heading",
    Text: "body",
    Button: "action",
    Image: "figure",
  },
  patterns: [
    {
      name: "Card layout",
      description: "Wrap content in a styled card",
      slots: [
        {
          name: "heading",
          accepts: ["heading"],
          cardinality: { kind: "first" },
        },
        { name: "body", accepts: ["body"], cardinality: { kind: "optional" } },
        {
          name: "action",
          accepts: ["action"],
          cardinality: { kind: "optional" },
        },
      ],
      data: {
        type: "Card",
        props: {
          id: "tmpl-card",
          style: { padding: "2rem" },
          children: [
            h("tmpl-h", "Card title"),
            t("tmpl-t", "Description goes here."),
            btn("tmpl-btn", "Get started"),
          ],
        },
      } as unknown as ComponentData,
    },
    {
      name: "Centered stack",
      description: "Vertically centered content block",
      slots: [
        {
          name: "heading",
          accepts: ["heading"],
          cardinality: { kind: "first" },
        },
        { name: "body", accepts: ["body"], cardinality: { kind: "optional" } },
        {
          name: "action",
          accepts: ["action"],
          cardinality: { kind: "optional" },
        },
      ],
      data: {
        type: "Stack",
        props: {
          id: "tmpl-stack",
          direction: "vertical",
          gap: "1.5rem",
          style: { alignItems: "center", textAlign: "center", padding: "3rem" },
          children: [
            h("tmpl-sh", "Section heading"),
            t("tmpl-st", "Supporting text."),
            btn("tmpl-sbtn", "Action"),
          ],
        },
      } as unknown as ComponentData,
    },
  ],
};
