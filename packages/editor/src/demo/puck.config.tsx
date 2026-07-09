import { Fragment, type ReactNode } from "react";
import type { Config } from "@puckeditor/core";

const opt = <T extends string | number>(value: T) => ({
  label: String(value),
  value,
});

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

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
  "#111111",
  "#2F3437",
  "#555555",
  "#888888",
  "#CCCCCC",
  "#EAEAEA",
  "#F7F6F3",
  "#FBFBFA",
  "#FFFFFF",
  "#FDEBEC",
  "#E1F3FE",
  "#EDF3EC",
  "#FBF3DB",
].map(opt);

const radius = ["0", "4px", "6px", "8px", "12px", "16px", "9999px"].map(opt);

const borderWidth = ["0", "1px", "2px", "3px", "4px"].map(opt);

const emphasisLevel = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const bannerTone = [
  { label: "Neutral", value: "neutral" },
  { label: "Informational", value: "informational" },
  { label: "Positive", value: "positive" },
  { label: "Warning", value: "warning" },
  { label: "Critical", value: "critical" },
];

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
  "'Helvetica Neue', Helvetica, Arial, sans-serif",
  "'Playfair Display', Georgia, serif",
  "'Courier New', 'Lucida Console', monospace",
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
            maxWidth: {
              type: "select",
              options: maxWidth,
              metadata: { control: "dimension", unit: "px" },
            },
            margin: {
              type: "select",
              options: margin,
              metadata: { control: "dimension", unit: "rem" },
            },
            padding: {
              type: "select",
              options: space,
              metadata: { control: "dimension", unit: "rem" },
            },
            fontFamily: { type: "select", options: fontFamily },
            color: {
              type: "select",
              options: color,
              metadata: { control: "swatch" },
            },
            background: {
              type: "select",
              options: color,
              metadata: { control: "swatch" },
            },
            borderRadius: {
              type: "select",
              options: radius,
              metadata: { control: "dimension", unit: "px" },
            },
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
        level: {
          type: "select",
          options: headingLevel,
          metadata: { control: "segmented" },
        },
        style: {
          type: "object",
          objectFields: {
            fontSize: {
              type: "select",
              options: fontSize,
              metadata: { control: "dimension", unit: "rem" },
            },
            marginBottom: {
              type: "select",
              options: space,
              metadata: { control: "dimension", unit: "rem" },
            },
            textAlign: {
              type: "select",
              options: textAlign,
              metadata: { control: "segmented" },
            },
            color: {
              type: "select",
              options: color,
              metadata: { control: "swatch" },
            },
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
        resolvedText: { type: "text" },
        style: {
          type: "object",
          objectFields: {
            fontSize: {
              type: "select",
              options: fontSize,
              metadata: { control: "dimension", unit: "rem" },
            },
            color: {
              type: "select",
              options: color,
              metadata: { control: "swatch" },
            },
            maxWidth: {
              type: "select",
              options: maxWidth,
              metadata: { control: "dimension", unit: "px" },
            },
            marginBottom: {
              type: "select",
              options: space,
              metadata: { control: "dimension", unit: "rem" },
            },
            lineHeight: {
              type: "select",
              options: lineHeight,
              metadata: { control: "dimension" },
            },
          },
        },
      },
      defaultProps: {
        text: "Add your content here.",
        style: { marginBottom: "1rem", lineHeight: "1.6" },
      },
      resolveData: async (node, { trigger }) => {
        await delay(1000);
        return {
          props: {
            resolvedText: `Resolved ${trigger}: ${String(node.props.text ?? "")}`,
          },
          readOnly: { resolvedText: true },
        };
      },
      // `resolvedText` is populated by resolveData and shown as a read-only
      // field in the sheet (demoing the honest read-only resolved presentation)
      // — it is deliberately NOT rendered as page content, so the resolver's
      // debug string never leaks into the canvas.
      render: ({ text, style }) => (
        <div>
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
        </div>
      ),
    },

    Button: {
      fields: {
        label: { type: "text" },
        variant: {
          type: "select",
          options: buttonVariant,
          metadata: { control: "segmented" },
        },
      },
      defaultProps: { label: "Get started", variant: "primary" },
      render: ({ label, variant }) => {
        const isPrimary = variant !== "secondary";
        return (
          <button
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "5px",
              border: isPrimary ? "none" : "1px solid #CCCCCC",
              background: isPrimary ? "#111111" : "transparent",
              color: isPrimary ? "#FFFFFF" : "#111111",
              fontSize: "0.9375rem",
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              letterSpacing: "0.01em",
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
            width: {
              type: "select",
              options: maxWidth,
              metadata: { control: "dimension", unit: "px" },
            },
            maxWidth: {
              type: "select",
              options: maxWidth,
              metadata: { control: "dimension", unit: "px" },
            },
            borderRadius: {
              type: "select",
              options: radius,
              metadata: { control: "dimension", unit: "px" },
            },
            objectFit: {
              type: "select",
              options: objectFit,
              metadata: { control: "segmented" },
            },
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
        direction: {
          type: "select",
          options: stackDirection,
          metadata: { control: "segmented" },
        },
        gap: {
          type: "select",
          options: space,
          metadata: { control: "dimension", unit: "rem" },
        },
        style: {
          type: "object",
          objectFields: {
            margin: {
              type: "select",
              options: margin,
              metadata: { control: "dimension", unit: "rem" },
            },
            padding: {
              type: "select",
              options: space,
              metadata: { control: "dimension", unit: "rem" },
            },
            textAlign: {
              type: "select",
              options: textAlign,
              metadata: { control: "segmented" },
            },
            alignItems: {
              type: "select",
              options: alignItems,
              metadata: { control: "segmented" },
            },
            background: {
              type: "select",
              options: color,
              metadata: { control: "swatch" },
            },
            borderRadius: {
              type: "select",
              options: radius,
              metadata: { control: "dimension", unit: "px" },
            },
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
        header: { type: "slot", allow: ["Heading", "Text"] },
        body: { type: "slot" },
        footer: { type: "slot" },
        tags: {
          type: "array",
          arrayFields: { label: { type: "text" } },
          defaultItemProps: { label: "New tag" },
          getItemSummary: (item, i) =>
            (item.label as string) || `Tag ${(i ?? 0) + 1}`,
          min: 1,
          max: 4,
        },
        features: {
          type: "array",
          arrayFields: {
            title: { type: "text" },
            detail: { type: "text" },
          },
          defaultItemProps: { title: "New feature", detail: "" },
          getItemSummary: (item, i) =>
            (item.title as string) || `Feature ${(i ?? 0) + 1}`,
        },
        note: { type: "textarea", metadata: { control: "richtext" } },
        style: {
          type: "object",
          objectFields: {
            padding: {
              type: "select",
              options: space,
              metadata: { control: "dimension", unit: "rem" },
            },
            background: {
              type: "select",
              options: color,
              metadata: { control: "swatch" },
            },
            borderRadius: {
              type: "select",
              options: radius,
              metadata: { control: "dimension", unit: "px" },
            },
          },
        },
      },
      defaultProps: {
        style: {},
        header: [
          {
            type: "Heading",
            props: { id: "", text: "Card title", level: "h3", style: {} },
          },
        ],
        body: [
          {
            type: "Text",
            props: { id: "", text: "Card description goes here.", style: {} },
          },
        ],
        footer: [],
        tags: [{ label: "New tag" }],
        features: [],
      },
      render: ({
        header: Header,
        body: Body,
        footer: Footer,
        style,
        tags,
        features,
        note,
      }) => (
        <div
          style={{
            border: "1px solid #EAEAEA",
            borderRadius: "8px",
            padding: "2rem",
            background: "#FFFFFF",
            ...style,
          }}
        >
          <Header as={BareSlot} />
          <Body as={BareSlot} />
          {typeof note === "string" && note ? (
            <div
              data-note
              dangerouslySetInnerHTML={{ __html: note }}
              style={{
                marginTop: "0.5rem",
                paddingLeft: "0.75rem",
                borderLeft: "2px solid #EAEAEA",
                color: "#666666",
                fontSize: "0.875rem",
              }}
            />
          ) : null}
          {Array.isArray(tags) && tags.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.375rem",
                marginTop: "0.5rem",
              }}
            >
              {tags.map((tag: { label?: string }, i: number) => (
                <span
                  key={i}
                  data-tag
                  style={{
                    fontSize: "0.6875rem",
                    padding: "0.125rem 0.5rem",
                    border: "1px solid #EAEAEA",
                    borderRadius: "9999px",
                    color: "#555555",
                  }}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
          {Array.isArray(features) && features.length > 0 && (
            <ul
              data-features
              style={{ margin: "0.5rem 0 0", paddingLeft: "1rem" }}
            >
              {features.map(
                (f: { title?: string; detail?: string }, i: number) => (
                  <li
                    key={i}
                    data-feature
                    style={{ fontSize: "0.875rem", color: "#333333" }}
                  >
                    <strong>{f.title}</strong>
                    {f.detail ? ` — ${f.detail}` : ""}
                  </li>
                ),
              )}
            </ul>
          )}
          <Footer as={BareSlot} />
        </div>
      ),
    },

    Grid: {
      fields: {
        children: { type: "slot" },
        columns: { type: "select", options: gridColumns },
        gap: {
          type: "select",
          options: space,
          metadata: { control: "dimension", unit: "rem" },
        },
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
              header: [
                {
                  type: "Heading",
                  props: { id: "", text: "Card title", level: "h3", style: {} },
                },
              ],
              body: [
                {
                  type: "Text",
                  props: { id: "", text: "Card description.", style: {} },
                },
              ],
              footer: [],
            },
          },
          {
            type: "Card",
            props: {
              id: "",
              style: {},
              header: [
                {
                  type: "Heading",
                  props: { id: "", text: "Card title", level: "h3", style: {} },
                },
              ],
              body: [
                {
                  type: "Text",
                  props: { id: "", text: "Card description.", style: {} },
                },
              ],
              footer: [],
            },
          },
          {
            type: "Card",
            props: {
              id: "",
              style: {},
              header: [
                {
                  type: "Heading",
                  props: { id: "", text: "Card title", level: "h3", style: {} },
                },
              ],
              body: [
                {
                  type: "Text",
                  props: { id: "", text: "Card description.", style: {} },
                },
              ],
              footer: [],
            },
          },
        ],
      },
      render: ({ children: Children, columns, gap }) => (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns ?? 3}, 1fr)`,
            alignItems: "start",
            gap: gap ?? "1.5rem",
          }}
        >
          <Children as={BareSlot} />
        </div>
      ),
    },

    // Showcase for the rich controls (ticket 113) — reference material for demo
    // catalog v2. Exercises: radio rendered segmented (emphasis, 3 short options)
    // AND stacked (tone, 5 longer options); the spacing control on padding/margin
    // (1–4 token shorthand); and a nested object (style.border) that renders as a
    // hanging-caret disclosure inside the always-open Style section.
    Banner: {
      fields: {
        text: { type: "text" },
        emphasis: { type: "radio", options: emphasisLevel },
        tone: { type: "radio", options: bannerTone },
        style: {
          type: "object",
          objectFields: {
            padding: {
              type: "select",
              options: space,
              metadata: { control: "spacing", unit: "rem" },
            },
            margin: {
              type: "select",
              options: margin,
              metadata: { control: "spacing", unit: "rem" },
            },
            background: {
              type: "select",
              options: color,
              metadata: { control: "swatch" },
            },
            border: {
              type: "object",
              objectFields: {
                width: {
                  type: "select",
                  options: borderWidth,
                  metadata: { control: "dimension", unit: "px" },
                },
                color: {
                  type: "select",
                  options: color,
                  metadata: { control: "swatch" },
                },
              },
            },
          },
        },
      },
      defaultProps: {
        text: "Heads up — this banner shows the new controls.",
        emphasis: "medium",
        tone: "informational",
        style: {
          padding: "1.5rem",
          margin: "0 auto",
          background: "#E1F3FE",
          border: { width: "1px", color: "#CCCCCC" },
        },
      },
      render: ({ text, emphasis, tone, style }) => {
        const s = (style ?? {}) as {
          padding?: string;
          margin?: string;
          background?: string;
          border?: { width?: string; color?: string };
        };
        const border = s.border ?? {};
        const toneColor =
          {
            neutral: "#555555",
            informational: "#1E6FB8",
            positive: "#2F7D42",
            warning: "#9A6A00",
            critical: "#B3261E",
          }[(tone as string) ?? "neutral"] ?? "#555555";
        const emph =
          {
            low: { fontSize: "0.875rem", fontWeight: 400 },
            medium: { fontSize: "1rem", fontWeight: 500 },
            high: { fontSize: "1.25rem", fontWeight: 700 },
          }[(emphasis as string) ?? "medium"] ??
          ({ fontSize: "1rem", fontWeight: 500 } as const);
        const hasBorder = Boolean(border.width) && border.width !== "0";
        return (
          <div
            data-banner
            style={{
              padding: s.padding ?? "1.5rem",
              margin: s.margin,
              background: s.background ?? "#F7F6F3",
              borderRadius: "8px",
              border: hasBorder
                ? `${border.width} solid ${border.color ?? "#EAEAEA"}`
                : undefined,
              color: toneColor,
              ...emph,
            }}
          >
            {text}
          </div>
        );
      },
    },

    Sections: {
      fields: {
        items: {
          type: "array",
          arrayFields: {
            heading: { type: "text" },
            content: { type: "slot" },
          },
          defaultItemProps: { heading: "Section", content: [] },
          getItemSummary: (item, i) =>
            (item.heading as string) || `Section ${(i ?? 0) + 1}`,
        },
        style: {
          type: "object",
          objectFields: {
            gap: {
              type: "select",
              options: space,
              metadata: { control: "dimension", unit: "rem" },
            },
            padding: {
              type: "select",
              options: space,
              metadata: { control: "dimension", unit: "rem" },
            },
          },
        },
      },
      defaultProps: {
        style: { gap: "2rem", padding: "0" },
        items: [
          { heading: "Section one", content: [] },
          { heading: "Section two", content: [] },
        ],
      },
      render: ({ items, style }) => (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: style?.gap ?? "2rem",
            padding: style?.padding ?? "0",
          }}
        >
          {items.map(
            (
              item: {
                heading: string;
                content: React.FC<{ as: typeof BareSlot }>;
              },
              i: number,
            ) => (
              <div key={i} data-section>
                <h4
                  style={{
                    margin: "0 0 0.5rem",
                    fontSize: "1.125rem",
                    color: "#2F3437",
                  }}
                >
                  {item.heading}
                </h4>
                <item.content as={BareSlot} />
              </div>
            ),
          )}
        </div>
      ),
    },

    // Test-only irregular container. Four slots in declaration order
    // (head, divider, body, note) exercising the tiling edge cases on one page:
    // an empty `divider` between measured slots (band carving), a `note` slot
    // whose sliver child goes sub-floor on the vertical axis (yield), and a
    // `scatter` layout that absolutely positions children so their projections
    // interleave on both axes (discrete fallback). Plain by design — a rig.
    Panel: {
      fields: {
        head: { type: "slot" },
        divider: { type: "slot" },
        body: { type: "slot" },
        note: { type: "slot" },
        layout: {
          type: "select",
          options: [
            { label: "Stack", value: "stack" },
            { label: "Scatter", value: "scatter" },
          ],
          metadata: { control: "segmented" },
        },
      },
      defaultProps: {
        layout: "stack",
        head: [],
        divider: [],
        body: [],
        note: [],
      },
      render: ({
        head: Head,
        divider: Divider,
        body: Body,
        note: Note,
        layout,
      }) => {
        const scatter = layout === "scatter";
        return (
          <div
            style={{
              position: "relative",
              border: "1px solid #CCCCCC",
              padding: scatter ? "1rem" : "1rem 1rem 2px",
              width: "320px",
              height: scatter ? "180px" : undefined,
              display: scatter ? "block" : "flex",
              flexDirection: "column",
              gap: scatter ? undefined : "0.75rem",
            }}
          >
            <div
              style={
                scatter
                  ? { position: "absolute", top: "10px", left: "120px" }
                  : undefined
              }
            >
              <Head as={BareSlot} />
            </div>
            <div
              style={
                scatter
                  ? { position: "absolute", top: "60px", left: "10px" }
                  : undefined
              }
            >
              <Divider as={BareSlot} />
            </div>
            <div
              style={
                scatter
                  ? { position: "absolute", top: "30px", left: "10px" }
                  : undefined
              }
            >
              <Body as={BareSlot} />
            </div>
            <div
              style={
                scatter
                  ? { position: "absolute", top: "90px", left: "150px" }
                  : {
                      height: "4px",
                      overflow: "hidden",
                      marginTop: "-2px",
                    }
              }
            >
              <Note as={BareSlot} />
            </div>
          </div>
        );
      },
    },
  },

  root: {
    render: ({ children }: { children: ReactNode }) => <>{children}</>,
  },
};
