/**
 * The field/free-host organism contract (sp-64 §3.3b, §4, §5.1).
 *
 * Hero, Section, CTABand and DisclosureBand each carry the uniform 6-theme `theme` field
 * and paint through the shared `SectionShell`, but their slot grammars differ, so this
 * sweeps the shared facts (theme, themed render) over the set and then pins each organism's
 * distinguishing behaviour: Section's free heterogeneous body + inter-child rhythm,
 * CTABand's two `format` paths, DisclosureBand's total enum resolution, Hero's empty-media
 * absence.
 *
 * Slotted organisms render through their real `config.render` with a stub Slot component
 * that forwards children to the real per-organism `as` wrapper — so the real `SectionShell`
 * and rhythm wrappers execute.
 */

import type { ComponentConfig } from "@puckeditor/core";
import { describe, expect, test } from "bun:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { THEME_ORDER, THEMES } from "../tokens/themes";
import { CTABand, ctaBandConfig } from "./cta-band";
import { disclosureBandConfig } from "./disclosure-band";
import { heroConfig } from "./hero";
import { sectionConfig } from "./section";

/** A stub Slot component mirroring Puck's DropZone `as` contract, forwarding n children. */
function stubSlot(children: ReactNode[]) {
  return ({ as: As }: { as?: React.ElementType }) =>
    As ? <As>{children}</As> : <>{children}</>;
}

/** Render a slotted organism through its real config.render with `n` stub slot children. */
function renderHost(entry: HostCase, theme: string, n: number): string {
  const children = Array.from({ length: n }, (_, i) => (
    <div key={i} data-testid="child" />
  ));
  const render = entry.config.render as unknown as (
    props: Record<string, unknown>,
  ) => ReactNode;
  return renderToStaticMarkup(
    <>{render({ ...entry.base, theme, [entry.slot]: stubSlot(children) })}</>,
  );
}

interface HostCase {
  name: string;
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous prop shapes, one contract
  config: ComponentConfig<any>;
  slot: string;
  base: Record<string, unknown>;
}

const THEMED: HostCase[] = [
  {
    name: "Hero",
    config: heroConfig,
    slot: "actions",
    base: {
      eyebrow: "",
      headline: "H",
      subhead: "",
      media: { src: "", alt: "" },
    },
  },
  { name: "Section", config: sectionConfig, slot: "body", base: {} },
  {
    name: "CTABand",
    config: ctaBandConfig,
    slot: "actions",
    base: { headline: "H", subhead: "" },
  },
];

describe("field-host organisms — shared theme contract (§5.1)", () => {
  for (const { name, config } of [
    ...THEMED,
    { name: "DisclosureBand", config: disclosureBandConfig },
  ]) {
    describe(name, () => {
      test("carries the uniform 6-theme select", () => {
        const theme = (
          config.fields as Record<
            string,
            { type: string; options: { value: string }[] }
          >
        ).theme;
        expect(theme.type).toBe("select");
        expect(theme.options.map((o) => o.value)).toEqual([...THEME_ORDER]);
      });

      test("default theme is a real theme", () => {
        expect(THEMES).toHaveProperty(
          (config.defaultProps as { theme: string }).theme,
        );
      });
    });
  }

  for (const entry of THEMED) {
    test(`${entry.name} renders a themed SectionShell at n=0/1/3`, () => {
      for (const n of [0, 1, 3]) {
        const html = renderHost(entry, "business", n);
        expect(html).toContain('data-theme="business"');
        expect(html).toContain("almond-section");
      }
    });
  }
});

describe("slot grammar (§4)", () => {
  const allowOf = (
    // biome-ignore lint/suspicious/noExplicitAny: reads the erased slot allow list
    config: ComponentConfig<any>,
    key: string,
  ) => (config.fields as Record<string, { allow?: string[] }>)[key].allow;

  test("Hero.actions allows the curated CTA set", () => {
    expect(allowOf(heroConfig, "actions")).toEqual([
      "Button",
      "AppStoreBadges",
      "RateWidget",
    ]);
  });

  test("Section.body allows the free heterogeneous set", () => {
    expect(allowOf(sectionConfig, "body")).toEqual([
      "Heading",
      "Text",
      "Prose",
      "Button",
      "Image",
      "Divider",
      "AppStoreBadges",
      "ProductSummary",
      "RateWidget",
      "ComparisonTable",
    ]);
  });

  test("CTABand.actions allows Button + AppStoreBadges", () => {
    expect(allowOf(ctaBandConfig, "actions")).toEqual([
      "Button",
      "AppStoreBadges",
    ]);
  });
});

describe("Section owns inter-child rhythm (§3.3b)", () => {
  const sectionCase = THEMED.find((c) => c.name === "Section") as HostCase;
  test("wraps the free body in the rhythm wrapper regardless of count", () => {
    for (const n of [0, 2, 5]) {
      const html = renderHost(sectionCase, "personal", n);
      expect(html).toContain("almond-section-body");
    }
  });
});

describe("CTABand — both format render paths exist (§5.1)", () => {
  const view = (format: "band" | "interstitial") =>
    renderToStaticMarkup(
      <CTABand
        theme="personal"
        headline="H"
        subhead="S"
        actions={null}
        format={format}
      />,
    );

  test("band is the default path", () => {
    const html = renderToStaticMarkup(
      <CTABand theme="personal" headline="H" subhead="S" actions={null} />,
    );
    expect(html).toContain('data-format="band"');
  });

  test("interstitial path renders its own format", () => {
    expect(view("interstitial")).toContain('data-format="interstitial"');
  });

  test("optional subhead is absent when empty", () => {
    const html = renderToStaticMarkup(
      <CTABand theme="personal" headline="H" subhead="" actions={null} />,
    );
    expect(html).not.toContain("almond-cta__subhead");
  });
});

describe("DisclosureBand — total enum resolution (§6)", () => {
  const render = (snippets: { id: string }[]) => {
    const r = disclosureBandConfig.render as unknown as (p: {
      theme: string;
      snippets: { id: string }[];
    }) => ReactNode;
    return renderToStaticMarkup(<>{r({ theme: "personal", snippets })}</>);
  };

  test("renders the resolved snippet bodies in order", () => {
    const html = render([{ id: "fx" }, { id: "deposits" }]);
    const fxAt = html.indexOf("Exchange rates are indicative");
    const depositsAt = html.indexOf("Eligible deposits are protected");
    expect(fxAt).toBeGreaterThan(-1);
    expect(depositsAt).toBeGreaterThan(fxAt);
  });

  test("silently drops an unknown id rather than inventing a statement", () => {
    const html = render([{ id: "deposits" }, { id: "not-a-real-disclosure" }]);
    expect(html).toContain("Eligible deposits are protected");
    expect(html).not.toContain("not-a-real-disclosure");
  });

  test("snippets picker is flagged non-morphable (§5.4)", () => {
    const snippets = (
      disclosureBandConfig.fields as {
        snippets: { metadata?: { morphable?: boolean } };
      }
    ).snippets;
    expect(snippets.metadata?.morphable).toBe(false);
  });
});

describe("Hero — empty media is absence, not a broken frame (§2.7)", () => {
  const render = (media: { src: string; alt: string }) => {
    const r = heroConfig.render as unknown as (p: {
      theme: string;
      eyebrow: string;
      headline: string;
      subhead: string;
      media: { src: string; alt: string };
      actions: unknown;
    }) => ReactNode;
    return renderToStaticMarkup(
      <>
        {r({
          theme: "personal",
          eyebrow: "",
          headline: "H",
          subhead: "",
          media,
          actions: stubSlot([]),
        })}
      </>,
    );
  };

  test("no media node when src is empty", () => {
    expect(render({ src: "", alt: "" })).not.toContain("almond-hero__media");
  });

  test("frames the image when src is present", () => {
    const html = render({ src: "/x.jpg", alt: "x" });
    expect(html).toContain("almond-hero__media");
    expect(html).toContain("almond-image");
  });
});
