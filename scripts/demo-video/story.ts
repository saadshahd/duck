// The demo-video story: one place for every scripted fact.
//
// The drive script (record.ts) performs the designer edits with these exact
// values, and bake-spec.ts writes the MCP project's spec.json as
// sample-data + DESIGNER_DELTAS. That makes the stored page identical to
// what's on the designer's screen when the agent connects, so the agent's
// live edit arrives as a clean delta instead of silently reverting the
// designer's work.

export const PAGE = "landing";
export const BRIDGE_PORT = 4400;

// ── Designer beats (performed by the drive, baked into spec.json) ──

export const DESIGNER_DELTAS = {
  headingText: "The page is the editor.",
  headingColor: "#555555",
  buttonVariant: "secondary",
} as const;

export const TARGETS = {
  heading: "hero-heading",
  primaryButton: "hero-cta-primary",
  featuresGrid: "features-grid",
} as const;

// ── Agent beat (a real MCP editor_apply + editor_commit) ───────────

export const AGENT_CARD = {
  type: "Card",
  props: {
    id: "feature-4",
    style: {},
    tags: [{ label: "MCP" }],
    header: [
      {
        type: "Heading",
        props: {
          id: "feature-4-title",
          level: "h3",
          text: "Live Bridge",
          style: {},
        },
      },
    ],
    body: [
      {
        type: "Text",
        props: {
          id: "feature-4-desc",
          text: "Agents edit over MCP and the change lands on your screen, live. Undo is always yours.",
          style: { color: "#555555" },
        },
      },
    ],
    footer: [],
  },
} as const;

export const AGENT_OPS = [
  {
    op: "add",
    parentId: TARGETS.featuresGrid,
    slotKey: "children",
    index: 3,
    component: AGENT_CARD,
  },
] as const;

export const AGENT_COMMIT_LABEL = "Agent: add Live Bridge card";

// ── Narration (one line per beat; timing measured after synthesis) ──

export type Beat = {
  id: string;
  line: string;
  /** Minimum on-screen dwell for this beat, before narration padding. */
  minMs: number;
};

export const BEATS: Beat[] = [
  {
    id: "zero-chrome",
    line: "This is a finished landing page. It is also the editor. No panels, no toolbars — the page is the editor.",
    minMs: 5000,
  },
  {
    id: "intent",
    line: "Chrome appears only on intent. Hover to see structure. Click to select.",
    minMs: 5000,
  },
  {
    id: "inline-edit",
    line: "Edit text right on the page. What you type is what ships.",
    minMs: 6000,
  },
  {
    id: "prop-sheet",
    line: "Deeper changes open one focused sheet — the element stays in view while you tune it.",
    minMs: 7000,
  },
  {
    id: "morph",
    line: "Morph offers ready alternatives. Preview on hover, commit in one click.",
    minMs: 7000,
  },
  {
    id: "agent",
    line: "And Duck is MCP native. Here, a real AI agent adds a feature card — and it lands live on the designer's screen.",
    minMs: 9000,
  },
  {
    id: "undo",
    line: "Every agent commit is a labeled history entry. Command Z, and it's gone. The designer stays in charge.",
    minMs: 6000,
  },
  {
    id: "outro",
    line: "Deselect, and the chrome vanishes. Duck. The page is the editor.",
    minMs: 6000,
  },
];
