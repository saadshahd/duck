import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

/**
 * Minimal demo catalog using plain HTML elements.
 * Proves the editor works with ANY catalog — not tied to a specific component library.
 * Replace with your own catalog (Primer, shadcn, etc.) for real components.
 */
export const catalog = defineCatalog(schema, {
  components: {
    Box: {
      description: "Layout container",
      props: z.object({
        style: z.record(z.unknown()).optional(),
      }),
    },
    Heading: {
      description: "Section heading",
      props: z.object({
        level: z.enum(["h1", "h2", "h3", "h4"]).optional(),
        text: z.string(),
        style: z.record(z.unknown()).optional(),
      }),
    },
    Text: {
      description: "Paragraph text",
      props: z.object({
        text: z.string(),
        style: z.record(z.unknown()).optional(),
      }),
    },
    Button: {
      description: "Clickable button",
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary"]).optional(),
        style: z.record(z.unknown()).optional(),
      }),
    },
    Image: {
      description: "Display image",
      props: z.object({
        src: z.string(),
        alt: z.string(),
        style: z.record(z.unknown()).optional(),
      }),
    },
    Stack: {
      description: "Vertical or horizontal stack layout",
      props: z.object({
        direction: z.enum(["vertical", "horizontal"]).optional(),
        gap: z.string().optional(),
        style: z.record(z.unknown()).optional(),
      }),
    },
    Card: {
      description: "Content card with border and padding",
      props: z.object({
        style: z.record(z.unknown()).optional(),
      }),
    },
    Grid: {
      description: "CSS grid layout",
      props: z.object({
        columns: z.number().optional(),
        gap: z.string().optional(),
        style: z.record(z.unknown()).optional(),
      }),
    },
  },
  actions: {},
});
