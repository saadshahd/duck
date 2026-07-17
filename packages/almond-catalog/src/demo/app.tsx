/**
 * Component observer harness — renders the atom surface and the 10-leaf molecule
 * surface, live-swapping all six themes × light/dark with the derived AA ratios shown
 * alongside. The chrome here is the "studio", not Almond: it deliberately ignores the
 * token contract.
 *
 * The proof: the component markup never changes; only the ambient `data-theme` /
 * `.mode-dark` context does, and every atom and molecule reskins from the emitted matrix.
 */

import { Render } from "@puckeditor/core";
import { useMemo, useState } from "react";
import { config } from "../puck.config";
import { AppStoreBadges } from "../components/app-store-badges";
import { Button } from "../components/button";
import { Certification } from "../components/certification";
import { ComparisonTable } from "../components/comparison-table";
import { Divider } from "../components/divider";
import { FaqItem } from "../components/faq-item";
import { FeatureItem } from "../components/feature-item";
import { Heading, type HeadingLevel } from "../components/heading";
import { Image } from "../components/image";
import { LogoItem } from "../components/logo-item";
import { PlanCard } from "../components/plan-card";
import { ProductSummary } from "../components/product-summary";
import { Prose } from "../components/prose";
import { RateWidget } from "../components/rate-widget";
import { StatItem } from "../components/stat-item";
import { StepItem } from "../components/step-item";
import { Testimonial } from "../components/testimonial";
import { Text } from "../components/text";
import { deriveTheme } from "../tokens/derive";
import { emitThemeCss } from "../tokens/emit";
import { THEME_ORDER, THEMES, type ThemeName } from "../tokens/themes";

const LEVELS: { level: HeadingLevel; text: string }[] = [
  { level: 1, text: "Money you keep, quietly." },
  { level: 2, text: "The boring parts of money, finally solved." },
  { level: 3, text: "No hidden markup" },
  { level: 4, text: "Held in your name" },
];

const COLLECTION_ORGANISMS = [
  "FeatureGrid",
  "StatBand",
  "LogoCloud",
  "TrustSection",
  "TestimonialSection",
  "FAQSection",
  "StepsSection",
  "ProductShowcase",
] as const;

const shell: React.CSSProperties = {
  fontFamily: "system-ui, sans-serif",
  minHeight: "100vh",
  background: "#0e0e10",
  color: "#e9e9ee",
  padding: "24px",
  display: "grid",
  gap: "20px",
  justifyItems: "center",
};

/** Shared themed-surface panel; each surface spreads this and sets its own `gap`. */
const panel: React.CSSProperties = {
  width: "min(760px, 100%)",
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "calc(var(--radius) + 8px)",
  padding: "clamp(1.5rem, 4vw, 3rem)",
  display: "grid",
};

export function App() {
  const css = useMemo(() => emitThemeCss(), []);
  const [theme, setTheme] = useState<ThemeName>("personal");
  const [dark, setDark] = useState(false);

  const derived = deriveTheme(theme);
  const aa = dark ? derived.dark.aa : derived.light.aa;

  // The 8 collection organisms rendered through Puck's real <Render> from the catalog
  // config — the honest consumer path, not a hand-reconstruction. Each organism's own
  // SectionShell themes its subtree, so the selected theme is stamped onto every one; the
  // seed items come straight from each config's defaults (minted with ids for Render).
  const organismDoc = useMemo(() => {
    // biome-ignore lint/suspicious/noExplicitAny: heterogeneous defaults, one demo doc
    const components = config.components as Record<string, any>;
    const content = COLLECTION_ORGANISMS.map((type, i) => {
      const defaults = components[type].defaultProps ?? {};
      const items = (defaults.items ?? []).map(
        (item: { props: object }, j: number) => ({
          ...item,
          props: { ...item.props, id: `org-${i}-item-${j}` },
        }),
      );
      return { type, props: { ...defaults, id: `org-${i}`, theme, items } };
    });
    return { root: {}, content };
  }, [theme]);

  return (
    <div className={dark ? "mode-dark" : undefined} style={shell}>
      <style>{css}</style>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {THEME_ORDER.map((name) => (
          <button
            key={name}
            onClick={() => setTheme(name)}
            aria-pressed={name === theme}
            style={swatch(name === theme)}
          >
            {THEMES[name].label}
          </button>
        ))}
        <button
          onClick={() => setDark((d) => !d)}
          aria-pressed={dark}
          style={swatch(dark)}
        >
          {dark ? "◑ Dark" : "◐ Light"}
        </button>
      </div>

      {/* the themed surface — one atom, many skins */}
      <div
        data-theme={theme}
        style={{
          ...panel,
          gap: "1.2rem",
          transition: "background .35s ease, border-color .35s ease",
        }}
      >
        {LEVELS.map(({ level, text }) => (
          <Heading key={level} level={level} text={text} />
        ))}

        <Prose body="<p>Money you keep, quietly. <strong>No hidden markup</strong>, no surprises — just the boring parts of money, finally solved. <a href='#'>See how it works</a>.</p>" />

        <Text text="Almond keeps the boring parts of money quiet, so you can get on with your day." />

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Button label="Open an account" href="#" variant="primary" />
          <Button label="Talk to us" href="#" variant="secondary" />
          <Button label="See how it works" href="#" variant="ghost" />
        </div>

        <div style={{ maxWidth: "260px" }}>
          <Image src="" alt="" ratio="landscape" />
        </div>

        <Divider variant="hairline" />
      </div>

      {/* Molecules surface — same one-skin-many-themes proof, ten leaves this time.
          The steps host owns the `counter-reset` the StepsSection organism (T5) will
          establish, so the CSS-counter badges number themselves. */}
      <div
        data-theme={theme}
        style={{
          ...panel,
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <FeatureItem
            icon="◇"
            heading="No hidden markup"
            text="The price you see is the price you pay."
          />
          <FeatureItem
            icon="◈"
            heading="Held in your name"
            text="Your money is never lent out."
          />
        </div>

        <div style={{ display: "flex", gap: "2.5rem", flexWrap: "wrap" }}>
          <StatItem value="0" label="hidden fees" />
          <StatItem value="4.1%" label="AER, paid daily" />
          <StatItem value="2 min" label="to open" />
        </div>

        <div
          style={{ counterReset: "almond-step", display: "grid", gap: "1rem" }}
        >
          <StepItem
            heading="Open your account"
            text="Two minutes, a photo of your ID."
          />
          <StepItem
            heading="Add your money"
            text="Bank transfer or debit card."
          />
          <StepItem
            heading="Start earning"
            text="Interest lands the next morning."
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          <PlanCard
            tier="Everyday"
            price="Free"
            period="forever"
            features={[{ label: "No monthly fee" }, { label: "Any currency" }]}
            cta={{ label: "Open an account", href: "#" }}
            highlight={false}
          />
          <PlanCard
            tier="Interest"
            price="4.1%"
            period="AER"
            features={[{ label: "Paid daily" }, { label: "Withdraw anytime" }]}
            cta={{ label: "Start earning", href: "#" }}
            highlight
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Certification icon="🛡" label="FSCS protected" />
          <Certification icon="🔒" label="256-bit encryption" />
        </div>

        <Testimonial
          quote="I finally understand where my money goes."
          author="Priya N."
          avatar=""
        />

        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          <LogoItem image="" alt="Acme" />
          <LogoItem image="" alt="Globex" />
          <LogoItem image="" alt="Initech" />
        </div>

        <FaqItem
          question="Is my money safe with Almond?"
          answer="<p>Yes — eligible deposits are protected up to <strong>£85,000</strong> by the FSCS.</p>"
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            alignItems: "start",
          }}
        >
          <ProductSummary productId="interest" />
          <ProductSummary productId="send" presentation="compact-row" />
        </div>

        <AppStoreBadges appStoreHref="#" playStoreHref="#" />
      </div>

      {/* Collection organisms — the 8 T5 organisms through Puck's real <Render>. Each
          SectionShell paints itself full-bleed with the selected theme; the seed items,
          layout-contract, and StepsSection counter all come from the catalog config. */}
      <div
        style={{
          width: "min(960px, 100%)",
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,.12)",
        }}
      >
        <Render config={config} data={organismDoc} />
      </div>

      {/* Computed widgets — the two T7 bare/resolved widgets read straight from their data
          modules (comparisons.ts, rates stub). Each carries its own `data-theme` root, so
          the selected theme reskins them too; the Almond column highlights internally and
          the interactive RateWidget converts live. */}
      <div data-theme={theme} style={{ ...panel, gap: "1.5rem" }}>
        <ComparisonTable theme={theme} comparisonSet="send" goal="full" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            alignItems: "start",
          }}
        >
          <RateWidget
            theme={theme}
            fromCurrency="USD"
            toCurrency="GBP"
            amount={1000}
          />
          <RateWidget
            theme={theme}
            fromCurrency="EUR"
            toCurrency="AUD"
            amount={500}
            mode="interactive"
          />
        </div>
      </div>

      {/* AA readout — the contrast the derive-recipe achieved for this theme×mode */}
      <div
        style={{
          display: "grid",
          gap: "6px",
          fontSize: "13px",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {Object.entries(aa).map(([pair, ratio]) => (
          <div
            key={pair}
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "space-between",
              minWidth: "320px",
            }}
          >
            <span style={{ color: "#b9b9c2" }}>{pair}</span>
            <span style={{ color: ratio >= 4.5 ? "#86efac" : "#fca5a5" }}>
              {ratio.toFixed(2)} {ratio >= 4.5 ? "AA ✓" : "FAIL"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function swatch(active: boolean): React.CSSProperties {
  return {
    font: "inherit",
    fontSize: "13px",
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: "9px",
    border: "1px solid rgba(255,255,255,.12)",
    background: active ? "#e9e9ee" : "rgba(255,255,255,.06)",
    color: active ? "#17171a" : "#e9e9ee",
  };
}
