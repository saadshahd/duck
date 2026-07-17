/**
 * Almond's named Pattern library (sp-64 §5.2) — a domain-named drop palette for the free
 * `Section` host, consumed by the editor's existing morph machinery (`createPatternRegistry`
 * → `findApplicable` → `apply` → `remintIds`; commits via `replace`). Catalog-only (sp-64 §0):
 * this authors data the generic engine consumes; no editor change.
 *
 * ## The engine shapes the design (ratified 2026-07-17)
 *
 * The patterns engine is a *re-structuring* engine, not a content generator: its explicit,
 * tested invariant is "no fabricated placeholders" (`merge.test.ts`). A template node claimed
 * by a slot is a PLACEHOLDER — replaced by matching content harvested from the selected
 * Section, or OMITTED when nothing matches. It never survives as fabricated content. A template
 * node injects verbatim ONLY when no slot accepts its role (unslotted / fixed).
 *
 * §5.2's trees + the done-bar ("drop onto an empty Section → the scaffold appears") assume
 * INJECTION. So each pattern commits to one rule:
 *
 *   **Fix the signature, slot the generic.**
 *
 * A pattern's *signature* — the beat it uniquely contributes — is UNSLOTTED, so it injects onto
 * an empty Section verbatim. The *generic* framing it re-homes (a Section's existing heading,
 * lede, or CTA) rides an OPTIONAL slot with a real placeholder, so matching content merges in
 * and unmatched placeholders cleanly omit. Two consequences, both intended:
 *   - drop onto an empty Section → the signature (and only the signature) appears;
 *   - a pattern is WITHHELD by the lossless gate once the Section already holds a signature role
 *     (injecting would duplicate/collide) — the honest "this would lose or double content" signal.
 *
 * Every slot is `optional`: a required slot would hide the pattern from an empty Section
 * (`isApplicable` fails a required slot with no match) and break the palette's primary job.
 */

import type { ComponentData } from "@puckeditor/core";
import type { PatternConfig, SectionPattern } from "@duckeditor/patterns";
import { DEFAULT_THEME } from "./tokens/themes";

// Node builders — every template node carries a stable `id` (reminted on apply, so these
// literals never reach a live document) and the exact prop shape of its component's config.
const heading = (id: string, text: string, level = 2): ComponentData =>
  ({ type: "Heading", props: { id, text, level } }) as unknown as ComponentData;

const text = (id: string, value: string): ComponentData =>
  ({ type: "Text", props: { id, text: value } }) as unknown as ComponentData;

const prose = (id: string, body: string): ComponentData =>
  ({ type: "Prose", props: { id, body } }) as unknown as ComponentData;

const button = (
  id: string,
  label: string,
  variant: "primary" | "secondary" | "ghost",
): ComponentData =>
  ({
    type: "Button",
    props: { id, label, href: "#", variant },
  }) as unknown as ComponentData;

const appStoreBadges = (id: string): ComponentData =>
  ({
    type: "AppStoreBadges",
    props: { id, appStoreHref: "#", playStoreHref: "#" },
  }) as unknown as ComponentData;

const section = (id: string, body: ComponentData[]): ComponentData =>
  ({
    type: "Section",
    props: { id, theme: DEFAULT_THEME, body },
  }) as unknown as ComponentData;

/**
 * Every catalog type gets a role so the traversal never hits an undefined lookup.
 *
 * - `Section` is a `container`: `collectTopLevel` drills its `body` slot to harvest — and
 *   therefore preserve — existing content when a pattern is applied. (Making it `collection`
 *   would silently drop the Section's content on morph.)
 * - The 10 `Section`-body-allowed types carry distinct content roles the pattern slots match.
 * - Collection-leaf molecules also carry content roles — honest, though never consulted for
 *   Section patterns (their collection-organism hosts are opaque units).
 * - Collection organisms and the page-level field hosts (Hero, CTABand, DisclosureBand) are
 *   `collection`: opaque units, never flattened or harvested by a Section pattern.
 */
const componentRoles: PatternConfig["componentRoles"] = {
  // Free host (drilled through)
  Section: "container",

  // Section-placeable content (the §4 body allow-list) — the roles patterns match
  Heading: "heading",
  Text: "body",
  Prose: "prose",
  Button: "action",
  Image: "figure",
  Divider: "divider",
  AppStoreBadges: "app-badges",
  ProductSummary: "product",
  ComparisonTable: "comparison",
  RateWidget: "rate",

  // Collection-leaf molecules — content, but only ever inside opaque collection organisms
  FeatureItem: "feature",
  StatItem: "stat",
  StepItem: "step",
  PlanCard: "plan",
  Certification: "certification",
  Testimonial: "testimonial",
  LogoItem: "logo",
  FaqItem: "faq",

  // Opaque section-level units — never harvested or flattened by a Section pattern
  FeatureGrid: "collection",
  StatBand: "collection",
  LogoCloud: "collection",
  TrustSection: "collection",
  TestimonialSection: "collection",
  FAQSection: "collection",
  StepsSection: "collection",
  ProductShowcase: "collection",
  Hero: "collection",
  CTABand: "collection",
  DisclosureBand: "collection",
};

const patterns: SectionPattern[] = [
  {
    // Signature: the framing heading + lede (fixed → injects). Re-homes an existing CTA.
    name: "Section Intro",
    description: "Eyebrow heading and a lede line that frames the grid below.",
    slots: [
      {
        name: "actions",
        accepts: ["action"],
        cardinality: { kind: "optional" },
      },
    ],
    data: section("tmpl-intro", [
      heading("tmpl-intro-h", "Everything your money should already do"),
      text(
        "tmpl-intro-t",
        "The everyday tools you'd expect, done plainly — no gimmicks, no surprise fees.",
      ),
      button("tmpl-intro-cta", "Learn more", "ghost"), // placeholder: re-homed or omitted
    ]),
  },
  {
    // Signature: one long-form passage (fixed → injects). Re-homes an existing CTA.
    name: "Prose Block",
    description: "A single long-form passage for legal copy or an explainer.",
    slots: [
      {
        name: "actions",
        accepts: ["action"],
        cardinality: { kind: "optional" },
      },
    ],
    data: section("tmpl-prose", [
      prose(
        "tmpl-prose-p",
        "<p>Almond keeps the boring parts of money quiet. <strong>No hidden markup</strong>, no surprises — just the everyday tools, finally done plainly.</p>",
      ),
      button("tmpl-prose-cta", "Read the full terms", "ghost"), // placeholder
    ]),
  },
  {
    // Signature: the primary + secondary CTA pair (fixed → injects). Re-homes a lead-in heading.
    name: "CTA Row",
    description: "A primary and secondary call to action, side by side.",
    slots: [
      { name: "lead", accepts: ["heading"], cardinality: { kind: "optional" } },
    ],
    data: section("tmpl-cta", [
      heading("tmpl-cta-h", "Ready when you are"), // placeholder: re-homed or omitted
      button("tmpl-cta-a", "Open an account", "primary"),
      button("tmpl-cta-b", "See how it works", "secondary"),
    ]),
  },
  {
    // Signature: the app-store badges (fixed → injects). Re-homes the existing heading + lede.
    name: "Get the App",
    description:
      "Almond's get-the-app beat — the store badges, over any heading and lede.",
    slots: [
      {
        name: "heading",
        accepts: ["heading"],
        cardinality: { kind: "optional" },
      },
      { name: "lede", accepts: ["body"], cardinality: { kind: "optional" } },
    ],
    data: section("tmpl-app", [
      heading("tmpl-app-h", "Your money, in your pocket"), // placeholder
      text(
        "tmpl-app-t",
        "Everything above, wherever you are. Free to download.",
      ), // placeholder
      appStoreBadges("tmpl-app-b"),
    ]),
  },
];

export const patternConfig: PatternConfig = { componentRoles, patterns };
