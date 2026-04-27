import { Fragment, type ReactNode } from "react";
import type { Config } from "@puckeditor/core";

// — Design tokens (plain option arrays for select fields) —

const opt = <T extends string | number>(value: T) => ({
  label: String(value),
  value,
});

const space = [
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
].map(opt);

const margin = [
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
].map(opt);

const fontSize = [
  "0.75rem",
  "0.875rem",
  "1rem",
  "1.125rem",
  "1.25rem",
  "1.5rem",
  "1.875rem",
  "2.25rem",
  "3rem",
].map(opt);

const color = [
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
].map(opt);

const radius = ["0", "4px", "6px", "8px", "12px", "16px", "9999px"].map(opt);

const maxWidth = [
  "320px",
  "480px",
  "640px",
  "768px",
  "1024px",
  "1048px",
  "1280px",
].map(opt);

const textAlign = ["left", "center", "right", "justify"].map(opt);

const alignItems = ["start", "center", "end", "stretch", "baseline"].map(opt);

const objectFit = ["contain", "cover", "fill", "none", "scale-down"].map(opt);

const fontFamily = [
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "Georgia, serif",
  "'Courier New', monospace",
].map(opt);

const lineHeight = [
  "1",
  "1.25",
  "1.375",
  "1.5",
  "1.6",
  "1.625",
  "1.75",
  "2",
].map(opt);

const headingLevel = [
  { label: "H1", value: "h1" },
  { label: "H2", value: "h2" },
  { label: "H3", value: "h3" },
  { label: "H4", value: "h4" },
];

const buttonVariant = [
  { label: "Primary", value: "primary" },
  { label: "Secondary", value: "secondary" },
];

const stackDirection = [
  { label: "Vertical", value: "vertical" },
  { label: "Horizontal", value: "horizontal" },
];

const gridColumns = [1, 2, 3, 4, 5, 6].map(opt);

const BareSlot: React.FC<{ children: ReactNode }> = ({ children }) => (
  <Fragment>{children}</Fragment>
);

export const config: Config = {
  components: {
    Box: {
      fields: {
        children: { type: "slot" },
        style: {
          type: "object",
          objectFields: {
            maxWidth: { type: "select", options: maxWidth },
            margin: { type: "select", options: margin },
            padding: { type: "select", options: space },
            fontFamily: { type: "select", options: fontFamily },
            color: { type: "select", options: color },
            background: { type: "select", options: color },
            borderRadius: { type: "select", options: radius },
          },
        },
      },
      defaultProps: {
        style: { maxWidth: "1048px", margin: "0 auto", padding: "2rem" },
        children: [
          {
            type: "Heading",
            props: { id: "", text: "Section heading", level: "h2", style: {} },
          },
          {
            type: "Text",
            props: { id: "", text: "Add your content here.", style: {} },
          },
        ],
      },
      render: ({ children: Children, style }) => (
        <div style={style}>
          <Children as={BareSlot} />
        </div>
      ),
    },

    Heading: {
      fields: {
        text: { type: "text" },
        level: { type: "select", options: headingLevel },
        style: {
          type: "object",
          objectFields: {
            fontSize: { type: "select", options: fontSize },
            marginBottom: { type: "select", options: space },
            textAlign: { type: "select", options: textAlign },
            color: { type: "select", options: color },
          },
        },
      },
      defaultProps: {
        text: "Section heading",
        level: "h2",
        style: { marginBottom: "0.5rem" },
      },
      render: ({ text, level, style }) => {
        const Tag = (level ?? "h2") as "h1" | "h2" | "h3" | "h4";
        return (
          <Tag
            style={{
              marginTop: 0,
              marginRight: 0,
              marginLeft: 0,
              marginBottom: "0.5rem",
              ...style,
            }}
          >
            {text}
          </Tag>
        );
      },
    },

    Text: {
      fields: {
        text: { type: "textarea" },
        style: {
          type: "object",
          objectFields: {
            fontSize: { type: "select", options: fontSize },
            color: { type: "select", options: color },
            maxWidth: { type: "select", options: maxWidth },
            marginBottom: { type: "select", options: space },
            lineHeight: { type: "select", options: lineHeight },
          },
        },
      },
      defaultProps: {
        text: "Add your content here.",
        style: { marginBottom: "1rem", lineHeight: "1.6" },
      },
      render: ({ text, style }) => (
        <p
          style={{
            marginTop: 0,
            marginRight: 0,
            marginLeft: 0,
            marginBottom: "1rem",
            lineHeight: "1.6",
            ...style,
          }}
        >
          {text}
        </p>
      ),
    },

    Button: {
      fields: {
        label: { type: "text" },
        variant: { type: "select", options: buttonVariant },
      },
      defaultProps: { label: "Get started", variant: "primary" },
      render: ({ label, variant }) => {
        const isPrimary = variant !== "secondary";
        return (
          <button
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              border: isPrimary ? "none" : "1px solid #d0d7de",
              background: isPrimary ? "#0969da" : "transparent",
              color: isPrimary ? "#fff" : "#24292f",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      },
    },

    Image: {
      fields: {
        src: { type: "text" },
        alt: { type: "text" },
        style: {
          type: "object",
          objectFields: {
            width: { type: "select", options: maxWidth },
            maxWidth: { type: "select", options: maxWidth },
            borderRadius: { type: "select", options: radius },
            objectFit: { type: "select", options: objectFit },
          },
        },
      },
      defaultProps: {
        src: "",
        alt: "Image description",
        style: { maxWidth: "640px" },
      },
      render: ({ src, alt, style }) => (
        <img
          src={src}
          alt={alt}
          style={{ maxWidth: "100%", borderRadius: "8px", ...style }}
        />
      ),
    },

    Stack: {
      fields: {
        children: { type: "slot" },
        direction: { type: "select", options: stackDirection },
        gap: { type: "select", options: space },
        style: {
          type: "object",
          objectFields: {
            margin: { type: "select", options: margin },
            padding: { type: "select", options: space },
            textAlign: { type: "select", options: textAlign },
            alignItems: { type: "select", options: alignItems },
            background: { type: "select", options: color },
            borderRadius: { type: "select", options: radius },
          },
        },
      },
      defaultProps: {
        direction: "vertical",
        gap: "1rem",
        style: {},
        children: [
          {
            type: "Heading",
            props: { id: "", text: "Section heading", level: "h2", style: {} },
          },
          {
            type: "Text",
            props: { id: "", text: "Add your content here.", style: {} },
          },
        ],
      },
      render: ({ children: Children, direction, gap, style }) => (
        <div
          style={{
            display: "flex",
            flexDirection: direction === "horizontal" ? "row" : "column",
            gap,
            ...style,
          }}
        >
          <Children as={BareSlot} />
        </div>
      ),
    },

    Card: {
      fields: {
        children: { type: "slot" },
        style: {
          type: "object",
          objectFields: {
            padding: { type: "select", options: space },
            background: { type: "select", options: color },
            borderRadius: { type: "select", options: radius },
          },
        },
      },
      defaultProps: {
        style: {},
        children: [
          {
            type: "Heading",
            props: { id: "", text: "Card title", level: "h3", style: {} },
          },
          {
            type: "Text",
            props: { id: "", text: "Card description goes here.", style: {} },
          },
        ],
      },
      render: ({ children: Children, style }) => (
        <div
          style={{
            border: "1px solid #d0d7de",
            borderRadius: "12px",
            padding: "1.5rem",
            background: "#fff",
            ...style,
          }}
        >
          <Children as={BareSlot} />
        </div>
      ),
    },

    Grid: {
      fields: {
        children: { type: "slot" },
        columns: { type: "select", options: gridColumns },
        gap: { type: "select", options: space },
      },
      defaultProps: {
        columns: 3,
        gap: "1.5rem",
        children: [
          {
            type: "Card",
            props: {
              id: "",
              style: {},
              children: [
                {
                  type: "Heading",
                  props: { id: "", text: "Card title", level: "h3", style: {} },
                },
                {
                  type: "Text",
                  props: { id: "", text: "Card description.", style: {} },
                },
              ],
            },
          },
          {
            type: "Card",
            props: {
              id: "",
              style: {},
              children: [
                {
                  type: "Heading",
                  props: { id: "", text: "Card title", level: "h3", style: {} },
                },
                {
                  type: "Text",
                  props: { id: "", text: "Card description.", style: {} },
                },
              ],
            },
          },
          {
            type: "Card",
            props: {
              id: "",
              style: {},
              children: [
                {
                  type: "Heading",
                  props: { id: "", text: "Card title", level: "h3", style: {} },
                },
                {
                  type: "Text",
                  props: { id: "", text: "Card description.", style: {} },
                },
              ],
            },
          },
        ],
      },
      render: ({ children: Children, columns, gap }) => (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns ?? 3}, 1fr)`,
            gap: gap ?? "1.5rem",
          }}
        >
          <Children as={BareSlot} />
        </div>
      ),
    },
  },

  root: {
    render: ({ children }: { children: ReactNode }) => <>{children}</>,
  },
};
