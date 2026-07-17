/**
 * The uniform collection-organism contract (sp-64 §3.3a, §4, §5.1).
 *
 * The eight organisms are hand-composed, but they share one contract, so this is a
 * data-driven sweep over the set rather than eight near-identical files. Each organism:
 *   - allows exactly one homogeneous molecule type in its slot (§4);
 *   - carries the uniform 6-theme `theme` field (§5.1);
 *   - seeds only that molecule type in its defaults;
 *   - renders a themed `SectionShell` + `CollectionGrid` that absorbs 0/1/many items.
 *
 * Render is driven through each config's real `render` with a stub slot component that
 * forwards the given children to the real per-organism body wrapper — so the real
 * `SectionShell`, the real layout-contract, and the real degrade rule all execute.
 */

import type { ComponentConfig, Fields } from "@puckeditor/core";
import { describe, expect, test } from "bun:test";
import { type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { THEME_ORDER, THEMES } from "../tokens/themes";
import { faqSectionConfig } from "./faq-section";
import { featureGridConfig } from "./feature-grid";
import { logoCloudConfig } from "./logo-cloud";
import { productShowcaseConfig } from "./product-showcase";
import { statBandConfig } from "./stat-band";
import { stepsSectionConfig } from "./steps-section";
import { testimonialSectionConfig } from "./testimonial-section";
import { trustSectionConfig } from "./trust-section";

interface OrganismCase {
  name: string;
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous prop shapes, one contract
  config: ComponentConfig<any>;
  molecule: string;
}

const ORGANISMS: OrganismCase[] = [
  { name: "FeatureGrid", config: featureGridConfig, molecule: "FeatureItem" },
  { name: "StatBand", config: statBandConfig, molecule: "StatItem" },
  { name: "LogoCloud", config: logoCloudConfig, molecule: "LogoItem" },
  {
    name: "TrustSection",
    config: trustSectionConfig,
    molecule: "Certification",
  },
  {
    name: "TestimonialSection",
    config: testimonialSectionConfig,
    molecule: "Testimonial",
  },
  { name: "FAQSection", config: faqSectionConfig, molecule: "FaqItem" },
  { name: "StepsSection", config: stepsSectionConfig, molecule: "StepItem" },
  {
    name: "ProductShowcase",
    config: productShowcaseConfig,
    molecule: "ProductSummary",
  },
];

// biome-ignore lint/suspicious/noExplicitAny: the render props carry Puck's slot component
type AnyFields = Fields<any>;

/** Render an organism through its real config.render with `n` stub molecule children. */
function renderOrganism(
  config: OrganismCase["config"],
  theme: string,
  n: number,
): string {
  const children: ReactNode[] = Array.from({ length: n }, (_, i) => (
    <div key={i} data-testid="molecule" />
  ));
  // The stub slot component mirrors Puck's DropZone `as` contract: it forwards the
  // slot's rendered children to the wrapper the organism passes as `as`.
  const Items = ({
    as: As,
  }: {
    // biome-ignore lint/suspicious/noExplicitAny: matches ElementType wrapper
    as?: any;
  }) => (As ? <As>{children}</As> : <>{children}</>);
  // config.render is a PuckComponent typed to require Puck's `puck` context; these
  // organisms never read it, so we drive render as a plain function past that gap.
  const render = config.render as unknown as (props: {
    theme: string;
    items: unknown;
  }) => ReactNode;
  return renderToStaticMarkup(<>{render({ theme, items: Items })}</>);
}

describe("collection organisms — uniform contract", () => {
  for (const { name, config, molecule } of ORGANISMS) {
    describe(name, () => {
      const fields = config.fields as AnyFields;

      test("slot allows exactly one homogeneous molecule type (§4)", () => {
        const items = fields.items;
        expect(items?.type).toBe("slot");
        expect((items as { allow?: string[] }).allow).toEqual([molecule]);
      });

      test("carries the uniform 6-theme select (§5.1)", () => {
        const theme = fields.theme as {
          type: string;
          options: { value: string }[];
        };
        expect(theme.type).toBe("select");
        expect(theme.options.map((o) => o.value)).toEqual([...THEME_ORDER]);
      });

      test("defaults: valid theme, and every seed item is the allowed molecule", () => {
        const defaults = config.defaultProps as {
          theme: string;
          items: { type: string }[];
        };
        expect(THEMES).toHaveProperty(defaults.theme);
        expect(defaults.items.map((it) => it.type)).toEqual(
          defaults.items.map(() => molecule),
        );
      });

      test("renders a themed SectionShell + grid at n=0/1/3", () => {
        for (const n of [0, 1, 3]) {
          const html = renderOrganism(config, "business", n);
          expect(html).toContain('data-theme="business"');
          expect(html).toContain("almond-section");
          expect(html).toContain("almond-grid");
        }
      });
    });
  }
});

describe("layout-contract flows through the organism (FeatureGrid, balance)", () => {
  test("n=0 keeps declared columns (base:1, md:3) — rhythm holds when empty", () => {
    const html = renderOrganism(featureGridConfig, "personal", 0);
    expect(html).toContain("--cols-base:1");
    expect(html).toContain("--cols-md:3");
  });

  test("n=0 paints the add-first affordance inside the section", () => {
    const html = renderOrganism(featureGridConfig, "personal", 0);
    expect(html).toContain("almond-grid__empty");
    expect(html).toContain("Add the first item");
  });

  test("n=1 collapses ghost tracks (balance → min(declared,count))", () => {
    const html = renderOrganism(featureGridConfig, "personal", 1);
    expect(html).toContain("--cols-md:1");
  });

  test("n=3 fills the declared three columns", () => {
    const html = renderOrganism(featureGridConfig, "personal", 3);
    expect(html).toContain("--cols-md:3");
  });
});

describe("StepsSection owns the step counter (T4 rider)", () => {
  test("body wrapper establishes counter-reset via .almond-steps", () => {
    const html = renderOrganism(stepsSectionConfig, "personal", 3);
    expect(html).toContain("almond-steps");
  });
});
