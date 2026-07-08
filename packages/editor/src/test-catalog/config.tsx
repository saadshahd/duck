import { Fragment, type ReactNode } from "react";
import type { Config } from "@puckeditor/core";

/** The frozen test catalog — a deliberate, stable contract the E2E suite boots
 *  against. It is NOT the demo: the demo (src/demo) may be rebuilt freely
 *  without touching a single test, because every behaviour the suite exercises
 *  is pinned here (control kinds, slot constraints, resolveData shape, the
 *  irregular Panel geometry). Plain by design — no fonts, no marketing copy. */

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

const margin = ["0", "0 auto", "0.5rem", "1rem", "1.5rem", "2rem", "3rem"].map(
  opt,
);

const fontSize = [
  "0.75rem",
  "0.875rem",
  "1rem",
  "1.25rem",
  "1.5rem",
  "1.875rem",
  "2.25rem",
  "3rem",
].map(opt);

const color = [
  "#111111",
  "#555555",
  "#888888",
  "#CCCCCC",
  "#EAEAEA",
  "#F7F6F3",
  "#FFFFFF",
  "#E1F3FE",
  "#FBF3DB",
].map(opt);

const radius = ["0", "4px", "8px", "12px", "9999px"].map(opt);

const borderWidth = ["0", "1px", "2px", "3px"].map(opt);

const maxWidth = ["320px", "480px", "640px", "768px", "1024px", "1048px"].map(
  opt,
);

const lineHeight = ["1", "1.25", "1.5", "1.6", "2"].map(opt);

const textAlign = ["left", "center", "right", "justify"].map(opt);

const alignItems = ["start", "center", "end", "stretch"].map(opt);

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

const BareSlot: React.FC<{ children: ReactNode }> = ({ children }) => (
  <Fragment>{children}</Fragment>
);

// Box.style.padding is a `dimension` control; Banner.style.padding is a
// `spacing` control. Same key, same depth, divergent renderer — the pair the
// in-place sheet-retarget test proves swaps live (do NOT unify).
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
        style: { padding: "2rem", margin: "0 auto" },
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
      render: ({ id, children: Children, style }) => (
        <div data-testid={id} style={style}>
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
      defaultProps: { text: "Section heading", level: "h2", style: {} },
      render: ({ id, text, level, style }) => {
        const Tag = (level ?? "h2") as "h1" | "h2" | "h3" | "h4";
        return (
          <Tag
            data-testid={id}
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
      defaultProps: { text: "Add your content here.", style: {} },
      // resolveData populates a read-only `resolvedText` after a ~1s delay,
      // re-firing every open (never one-shot). Its shape is a frozen contract:
      // `Resolved ${trigger}: ${text}` (resolution.e2e asserts "Resolved force: …").
      resolveData: async (node, { trigger }) => {
        await delay(1000);
        return {
          props: {
            resolvedText: `Resolved ${trigger}: ${String(node.props.text ?? "")}`,
          },
          readOnly: { resolvedText: true },
        };
      },
      render: ({ id, text, style }) => (
        <div data-testid={id}>
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
      defaultProps: { label: "Button", variant: "primary" },
      render: ({ id, label, variant }) => {
        const isPrimary = variant !== "secondary";
        return (
          <button
            data-testid={id}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "5px",
              border: isPrimary ? "none" : "1px solid #CCCCCC",
              background: isPrimary ? "#111111" : "transparent",
              color: isPrimary ? "#FFFFFF" : "#111111",
              fontSize: "0.9375rem",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      },
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
      // defaultProps.style is `{}` — no padding — so an inserted-then-emptied
      // Stack collapses to a 0×0 rect and becomes a ghost candidate. Load-bearing
      // for the ghost suite; do NOT add padding here.
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
      render: ({ id, children: Children, direction, gap, style }) => (
        <div
          data-testid={id}
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
        id,
        header: Header,
        body: Body,
        footer: Footer,
        style,
        tags,
        features,
        note,
      }) => (
        <div
          data-testid={id}
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
        ],
      },
      render: ({ id, children: Children, columns, gap }) => (
        <div
          data-testid={id}
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
        text: "Banner",
        emphasis: "medium",
        tone: "informational",
        style: {
          padding: "1.5rem",
          margin: "0 auto",
          background: "#E1F3FE",
          border: { width: "1px", color: "#CCCCCC" },
        },
      },
      render: ({ id, text, emphasis, tone, style }) => {
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
            data-testid={id}
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

    // Irregular container: four slots (head, divider, body, note) that exercise
    // tiling edge cases on one page — an empty interior `divider` (carved band),
    // a sub-floor `note` sliver (band yields), and a `scatter` layout whose
    // absolutely-positioned children force the discrete-marker fallback.
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
        id,
        head: Head,
        divider: Divider,
        body: Body,
        note: Note,
        layout,
      }) => {
        const scatter = layout === "scatter";
        return (
          <div
            data-testid={id}
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
