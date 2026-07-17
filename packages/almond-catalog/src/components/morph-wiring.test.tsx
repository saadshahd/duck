/**
 * The morph graph §5.1 — which quick-variants the picker offers per component (sp-64 §5.1,
 * §5.3, §5.4).
 *
 * The Duck engine (deriveVariations → quickVariants) surfaces every top-level discrete-choice
 * field — `select`/`radio` with ≤6 options — that is NOT flagged `morphable:false`. This sweep
 * mirrors that filter over the catalog's own field metadata, so the catalog's morph SURFACE is
 * asserted without importing editor internals (the engine's behaviour is proven in editor's
 * quick-variants.test.ts). Two obligations:
 *   1. each editable organism exposes exactly its expected presentational quick-variants, and
 *      every content-resolver (productId, comparisonSet, goal, disclosures, currency) is absent;
 *   2. each promoted field actually threads through the config's real `render`.
 */

import type { ComponentConfig, Field, Fields } from "@puckeditor/core";
import { describe, expect, test } from "bun:test";
import { type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ctaBandConfig } from "./cta-band";
import { comparisonTableConfig } from "./comparison-table";
import { disclosureBandConfig } from "./disclosure-band";
import { faqSectionConfig } from "./faq-section";
import { featureGridConfig } from "./feature-grid";
import { heroConfig } from "./hero";
import { logoCloudConfig } from "./logo-cloud";
import { productShowcaseConfig } from "./product-showcase";
import { productSummaryConfig } from "./product-summary";
import { rateWidgetConfig } from "./rate-widget";
import { sectionConfig } from "./section";
import { statBandConfig } from "./stat-band";
import { stepsSectionConfig } from "./steps-section";
import { testimonialSectionConfig } from "./testimonial-section";
import { trustSectionConfig } from "./trust-section";

const MAX_OPTIONS = 6;

// biome-ignore lint/suspicious/noExplicitAny: heterogeneous configs, one morph contract
type AnyConfig = ComponentConfig<any>;

/** The quick-variants the picker would offer for a component — the exact mirror of the
 *  engine's discrete-choice + morphable filter, over this config's fields. */
function pickerFields(config: AnyConfig): string[] {
  const fields = (config.fields ?? {}) as Fields;
  return Object.entries(fields)
    .filter(([, field]) => {
      const f = field as Field & {
        options?: unknown[];
        metadata?: { morphable?: unknown };
      };
      const discrete =
        (f.type === "select" || f.type === "radio") &&
        (f.options?.length ?? 0) <= MAX_OPTIONS;
      return discrete && f.metadata?.morphable !== false;
    })
    .map(([key]) => key)
    .sort();
}

const COLLECTION_ORGANISMS: [string, AnyConfig][] = [
  ["FeatureGrid", featureGridConfig],
  ["StatBand", statBandConfig],
  ["LogoCloud", logoCloudConfig],
  ["TrustSection", trustSectionConfig],
  ["TestimonialSection", testimonialSectionConfig],
  ["FAQSection", faqSectionConfig],
  ["StepsSection", stepsSectionConfig],
  ["ProductShowcase", productShowcaseConfig],
];

/** Expected picker contents per component (§5.1). Sorted keys. */
const PICKER_GRAPH: [string, AnyConfig, string[]][] = [
  ...COLLECTION_ORGANISMS.map(
    ([name, config]) =>
      [name, config, ["density", "theme"]] as [string, AnyConfig, string[]],
  ),
  ["Section", sectionConfig, ["theme"]],
  ["Hero", heroConfig, ["theme"]],
  ["CTABand", ctaBandConfig, ["format", "theme"]],
  ["DisclosureBand", disclosureBandConfig, ["theme"]],
  ["ComparisonTable", comparisonTableConfig, ["theme"]],
  ["RateWidget", rateWidgetConfig, ["mode", "theme"]],
  ["ProductSummary", productSummaryConfig, ["presentation"]],
];

describe("morph graph §5.1 — picker offers presentational alternatives only", () => {
  for (const [name, config, expected] of PICKER_GRAPH) {
    test(`${name} offers exactly ${JSON.stringify(expected)}`, () => {
      expect(pickerFields(config)).toEqual(expected);
    });
  }

  test("every content-resolver is excluded from every picker (§5.4)", () => {
    const CONTENT_RESOLVERS = [
      "productId",
      "comparisonSet",
      "goal",
      "snippets",
      "fromCurrency",
      "toCurrency",
    ];
    for (const [, config] of PICKER_GRAPH) {
      const offered = pickerFields(config);
      for (const resolver of CONTENT_RESOLVERS) {
        expect(offered).not.toContain(resolver);
      }
    }
  });
});

/** Render a collection organism through its real config.render at the given density. */
function renderOrganism({
  config,
  density,
  n,
}: {
  config: AnyConfig;
  density: "comfortable" | "compact";
  n: number;
}): string {
  const children: ReactNode[] = Array.from({ length: n }, (_, i) => (
    <div key={i} data-testid="molecule" />
  ));
  const Items = ({
    as: As,
  }: {
    // biome-ignore lint/suspicious/noExplicitAny: matches Puck's ElementType wrapper
    as?: any;
  }) => (As ? <As>{children}</As> : <>{children}</>);
  const render = config.render as unknown as (props: {
    theme: string;
    density: string;
    items: unknown;
  }) => ReactNode;
  return renderToStaticMarkup(
    <>{render({ theme: "personal", density, items: Items })}</>,
  );
}

describe("density threads its DS-authored {columns,degrade} bundle through render (§5.3)", () => {
  test("compact renders a different grid than comfortable for all 8 organisms", () => {
    for (const [name, config] of COLLECTION_ORGANISMS) {
      // n=8 ≥ every declared column count, so balance never masks the bundle difference.
      const comfortable = renderOrganism({
        config,
        density: "comfortable",
        n: 8,
      });
      const compact = renderOrganism({ config, density: "compact", n: 8 });
      expect(comfortable, `${name} density had no effect`).not.toBe(compact);
    }
  });

  test("LogoCloud reflow projects the exact per-density columns", () => {
    const comfortable = renderOrganism({
      config: logoCloudConfig,
      density: "comfortable",
      n: 8,
    });
    const compact = renderOrganism({
      config: logoCloudConfig,
      density: "compact",
      n: 8,
    });
    expect(comfortable).toContain("--cols-md:6");
    expect(compact).toContain("--cols-md:8");
  });

  test("an unknown density falls back to comfortable — render stays total", () => {
    const html = renderOrganism({
      config: featureGridConfig,
      // biome-ignore lint/suspicious/noExplicitAny: deliberately off-contract value
      density: "wat" as any,
      n: 3,
    });
    expect(html).toContain("--cols-md:3");
  });
});

/** Drive a config.render with plain props (no slot) and return its markup. */
function renderView(config: AnyConfig, props: Record<string, unknown>): string {
  const render = config.render as unknown as (p: unknown) => ReactNode;
  return renderToStaticMarkup(<>{render(props)}</>);
}

describe("binary morphs thread through their config render", () => {
  test("ProductSummary.presentation switches the card/row path", () => {
    expect(
      renderView(productSummaryConfig, {
        productId: "everyday",
        presentation: "full-card",
      }),
    ).toContain("almond-product--card");
    expect(
      renderView(productSummaryConfig, {
        productId: "everyday",
        presentation: "compact-row",
      }),
    ).toContain("almond-product--row");
  });

  test("RateWidget.mode toggles the interactive input", () => {
    const base = {
      theme: "personal",
      fromCurrency: "USD",
      toCurrency: "GBP",
      amount: 1000,
    };
    expect(
      renderView(rateWidgetConfig, { ...base, mode: "static" }),
    ).not.toContain("almond-rate__input");
    expect(
      renderView(rateWidgetConfig, { ...base, mode: "interactive" }),
    ).toContain("almond-rate__input");
  });

  test("CTABand.format threads to data-format", () => {
    // The actions slot is a stub mirroring Puck's DropZone `as` contract.
    const Actions = ({
      as: As,
    }: {
      // biome-ignore lint/suspicious/noExplicitAny: matches Puck's ElementType wrapper
      as?: any;
    }) => (As ? <As /> : null);
    const props = (format: string) => ({
      theme: "personal",
      format,
      headline: "H",
      subhead: "S",
      actions: Actions,
    });
    expect(renderView(ctaBandConfig, props("band"))).toContain(
      'data-format="band"',
    );
    expect(renderView(ctaBandConfig, props("interstitial"))).toContain(
      'data-format="interstitial"',
    );
  });
});
