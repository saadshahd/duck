import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

// — Design tokens —

const space = z.enum([
  "0",
  "0.25rem",
  "0.5rem",
  "0.75rem",
  "1rem",
  "1.25rem",
  "1.5rem",
  "2rem",
  "2.5rem",
  "3rem",
  "4rem",
]);

const margin = z.enum([
  "0",
  "0 auto",
  "0.5rem",
  "0.5rem 0",
  "1rem",
  "1rem 0",
  "1.5rem",
  "1.5rem 0",
  "2rem",
  "2rem 0",
  "3rem",
  "3rem 0",
]);

const fontSize = z.enum([
  "0.75rem",
  "0.875rem",
  "1rem",
  "1.125rem",
  "1.25rem",
  "1.5rem",
  "1.875rem",
  "2.25rem",
  "3rem",
]);

const color = z.enum([
  "#24292f",
  "#57606a",
  "#656d76",
  "#8b949e",
  "#d0d7de",
  "#f6f8fa",
  "#ffffff",
  "#0969da",
  "#1a7f37",
  "#cf222e",
]);

const radius = z.enum(["0", "4px", "6px", "8px", "12px", "16px", "9999px"]);

const maxWidth = z.enum([
  "320px",
  "480px",
  "640px",
  "768px",
  "1024px",
  "1048px",
  "1280px",
]);

const textAlign = z.enum(["left", "center", "right", "justify"]);

const alignItems = z.enum(["start", "center", "end", "stretch", "baseline"]);

const objectFit = z.enum(["contain", "cover", "fill", "none", "scale-down"]);

const fontFamily = z.enum([
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "Georgia, serif",
  "'Courier New', monospace",
]);

const lineHeight = z.enum(["1", "1.25", "1.375", "1.5", "1.625", "1.75", "2"]);

/**
 * Minimal demo catalog using plain HTML elements.
 * Proves the editor works with ANY catalog — not tied to a specific component library.
 * Replace with your own catalog (Primer, shadcn, etc.) for real components.
 */
export const catalog = defineCatalog(schema, {
  components: {
    Box: {
      description: "Layout container",
      slots: ["default"],
      props: z.object({
        style: z
          .object({
            maxWidth: maxWidth.optional(),
            margin: margin.optional(),
            padding: space.optional(),
            fontFamily: fontFamily.optional(),
            color: color.optional(),
            background: color.optional(),
            borderRadius: radius.optional(),
          })
          .optional(),
      }),
    },
    Heading: {
      description: "Section heading",
      props: z.object({
        level: z.enum(["h1", "h2", "h3", "h4"]).optional(),
        text: z.string(),
        style: z
          .object({
            fontSize: fontSize.optional(),
            marginBottom: space.optional(),
            textAlign: textAlign.optional(),
            color: color.optional(),
          })
          .optional(),
      }),
    },
    Text: {
      description: "Paragraph text",
      props: z.object({
        text: z.string(),
        style: z
          .object({
            fontSize: fontSize.optional(),
            color: color.optional(),
            maxWidth: maxWidth.optional(),
            marginBottom: space.optional(),
            lineHeight: lineHeight.optional(),
          })
          .optional(),
      }),
    },
    Button: {
      description: "Clickable button",
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary"]).optional(),
      }),
    },
    Image: {
      description: "Display image",
      props: z.object({
        src: z.string(),
        alt: z.string(),
        style: z
          .object({
            width: maxWidth.optional(),
            maxWidth: maxWidth.optional(),
            borderRadius: radius.optional(),
            objectFit: objectFit.optional(),
          })
          .optional(),
      }),
    },
    Stack: {
      description: "Vertical or horizontal stack layout",
      slots: ["default"],
      props: z.object({
        direction: z.enum(["vertical", "horizontal"]).optional(),
        gap: space.optional(),
        style: z
          .object({
            margin: margin.optional(),
            padding: space.optional(),
            textAlign: textAlign.optional(),
            alignItems: alignItems.optional(),
            background: color.optional(),
            borderRadius: radius.optional(),
          })
          .optional(),
      }),
    },
    Card: {
      description: "Content card with border and padding",
      slots: ["default"],
      props: z.object({
        style: z
          .object({
            padding: space.optional(),
            background: color.optional(),
            borderRadius: radius.optional(),
          })
          .optional(),
      }),
    },
    Grid: {
      description: "CSS grid layout",
      slots: ["default"],
      props: z.object({
        columns: z.number().optional(),
        gap: space.optional(),
        style: z
          .object({
            gap: space.optional(),
          })
          .optional(),
      }),
    },
  },
  actions: {},
});
