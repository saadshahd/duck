import type { ComponentData, Data } from "@puckeditor/core";

/** Frozen ids, labels, and copy the E2E suite selects against. Tests import
 *  these instead of hardcoding literals, so the demo (src/demo) may be rebuilt
 *  without breaking a single test. Never reintroduce a raw copy literal in a
 *  spec — reach through FIX. */
export const FIX = {
  page: { id: "page" },
  hero: { id: "hero" },
  heroActions: { id: "heroActions" },
  grid: { id: "grid" },
  testRig: { id: "testRig" },
  cta: { id: "cta" },

  heading: { id: "heroHeading", copy: "The editor is the canvas." },
  text: {
    id: "heroText",
    copy: "Duck brings AI composition and human review onto the same surface. No panels. No iframes. Just the page.",
  },
  buttonPrimary: { id: "buttonPrimary", label: "Start building" },
  buttonSecondary: { id: "buttonSecondary", label: "Read the docs" },
  buttonCta: { id: "ctaButton", label: "Get started" },

  card1: {
    id: "card1",
    title: "Zero Chrome",
    body: "No panels, no toolbars. The rendered page is the editor. Everything is contextual — appears on interaction, disappears when done.",
    tag: "Design",
  },
  card2: {
    id: "card2",
    title: "MCP-Native",
    body: "AI agents connect via MCP and compose UIs. The editor is a review surface, not a creation tool.",
    tags: ["Alpha", "Beta"],
    features: [
      { title: "Fast", detail: "Sub-second edits" },
      { title: "Secure", detail: "Sandboxed drafts" },
    ],
  },
  card3: {
    id: "card3",
    title: "Catalog-Agnostic",
    body: "Bring your own Puck Config — drop it in as-is, no migration needed.",
  },

  panelStack: {
    id: "panelStack",
    head: "Stack panel",
    body: "Measured body content fills this slot with a real box.",
    note: "sliver",
  },
  panelScatter: {
    id: "panelScatter",
    head: "Scatter",
    divider: "divider",
    body: "body",
    note: "note",
  },

  banner: { id: "banner", text: "Heads up — the new controls are live." },
} as const;

const heading = (
  id: string,
  text: string,
  level: "h1" | "h2" | "h3" = "h3",
): ComponentData =>
  ({
    type: "Heading",
    props: { id, text, level, style: {} },
  }) as unknown as ComponentData;

const textNode = (id: string, text: string): ComponentData =>
  ({
    type: "Text",
    props: { id, text, style: {} },
  }) as unknown as ComponentData;

const button = (
  id: string,
  label: string,
  variant: "primary" | "secondary",
): ComponentData =>
  ({
    type: "Button",
    props: { id, label, variant },
  }) as unknown as ComponentData;

const card = (props: Record<string, unknown>): ComponentData =>
  ({ type: "Card", props }) as unknown as ComponentData;

const panel = (props: Record<string, unknown>): ComponentData =>
  ({ type: "Panel", props }) as unknown as ComponentData;

export const fixture: Data = {
  root: { props: {} },
  content: [
    {
      type: "Box",
      props: {
        id: FIX.page.id,
        style: { padding: "2rem", margin: "0 auto" },
        children: [
          {
            type: "Stack",
            props: {
              id: FIX.hero.id,
              direction: "vertical",
              gap: "1.5rem",
              style: {
                padding: "4rem 0 3rem",
                textAlign: "center",
                alignItems: "center",
              },
              children: [
                heading(FIX.heading.id, FIX.heading.copy, "h1"),
                textNode(FIX.text.id, FIX.text.copy),
                {
                  type: "Stack",
                  props: {
                    id: FIX.heroActions.id,
                    direction: "horizontal",
                    gap: "0.75rem",
                    style: {},
                    children: [
                      button(
                        FIX.buttonPrimary.id,
                        FIX.buttonPrimary.label,
                        "primary",
                      ),
                      button(
                        FIX.buttonSecondary.id,
                        FIX.buttonSecondary.label,
                        "secondary",
                      ),
                    ],
                  },
                },
              ],
            },
          },
          {
            type: "Grid",
            props: {
              id: FIX.grid.id,
              columns: 3,
              gap: "1.5rem",
              children: [
                card({
                  id: FIX.card1.id,
                  style: {},
                  tags: [{ label: FIX.card1.tag }],
                  header: [heading(`${FIX.card1.id}Title`, FIX.card1.title)],
                  body: [textNode(`${FIX.card1.id}Body`, FIX.card1.body)],
                  footer: [],
                }),
                card({
                  id: FIX.card2.id,
                  style: {},
                  tags: FIX.card2.tags.map((label) => ({ label })),
                  features: FIX.card2.features.map((f) => ({ ...f })),
                  header: [heading(`${FIX.card2.id}Title`, FIX.card2.title)],
                  body: [textNode(`${FIX.card2.id}Body`, FIX.card2.body)],
                  footer: [],
                }),
                card({
                  id: FIX.card3.id,
                  style: {},
                  header: [heading(`${FIX.card3.id}Title`, FIX.card3.title)],
                  body: [textNode(`${FIX.card3.id}Body`, FIX.card3.body)],
                  footer: [],
                }),
              ],
            },
          },
          {
            type: "Stack",
            props: {
              id: FIX.cta.id,
              direction: "vertical",
              gap: "1rem",
              style: { padding: "3rem 0", alignItems: "center" },
              children: [
                button(FIX.buttonCta.id, FIX.buttonCta.label, "primary"),
              ],
            },
          },
          {
            type: "Stack",
            props: {
              id: FIX.testRig.id,
              direction: "horizontal",
              gap: "2rem",
              style: { padding: "3rem 0", alignItems: "start" },
              children: [
                panel({
                  id: FIX.panelStack.id,
                  layout: "stack",
                  head: [
                    heading(`${FIX.panelStack.id}Head`, FIX.panelStack.head),
                  ],
                  divider: [],
                  body: [
                    textNode(`${FIX.panelStack.id}Body`, FIX.panelStack.body),
                  ],
                  note: [
                    textNode(`${FIX.panelStack.id}Note`, FIX.panelStack.note),
                  ],
                }),
                panel({
                  id: FIX.panelScatter.id,
                  layout: "scatter",
                  head: [
                    heading(
                      `${FIX.panelScatter.id}Head`,
                      FIX.panelScatter.head,
                    ),
                  ],
                  divider: [
                    textNode(
                      `${FIX.panelScatter.id}Divider`,
                      FIX.panelScatter.divider,
                    ),
                  ],
                  body: [
                    textNode(
                      `${FIX.panelScatter.id}Body`,
                      FIX.panelScatter.body,
                    ),
                  ],
                  note: [
                    textNode(
                      `${FIX.panelScatter.id}Note`,
                      FIX.panelScatter.note,
                    ),
                  ],
                }),
              ],
            },
          },
          {
            type: "Banner",
            props: {
              id: FIX.banner.id,
              text: FIX.banner.text,
              emphasis: "high",
              tone: "warning",
              style: {
                padding: "1.5rem",
                margin: "0 auto",
                background: "#FBF3DB",
                border: { width: "1px", color: "#CCCCCC" },
              },
            },
          },
        ],
      },
    },
  ],
};
