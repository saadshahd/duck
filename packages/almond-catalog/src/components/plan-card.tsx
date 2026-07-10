/**
 * PlanCard — one pricing tier for the PricingTable collection (sp-64 §3.2).
 *
 * A leaf: tier name, price + period, a bulleted `features` list, and a single CTA.
 * `highlight` promotes one card as the recommended tier (a curated boolean, not raw
 * style). `features` is modeled as `{ label }[]` — the house array-field shape (mirrors
 * the demo catalog's `tags`), since a Puck array field stores records, not bare strings.
 * Puck has no boolean field, so `highlight` is a two-option radio over boolean values.
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./plan-card.css";

export interface PlanFeature {
  label: string;
}

export interface PlanCta {
  label: string;
  href: string;
}

export interface PlanCardProps {
  tier: string;
  price: string;
  period: string;
  features: PlanFeature[];
  cta: PlanCta;
  highlight: boolean;
}

export function PlanCard({
  tier,
  price,
  period,
  features,
  cta,
  highlight,
}: PlanCardProps) {
  return (
    <article className="almond-plan" data-highlight={highlight}>
      <span className="almond-plan__tier">{tier}</span>
      <p className="almond-plan__price">
        <span className="almond-plan__amount">{price}</span>
        {period ? <span className="almond-plan__period">{period}</span> : null}
      </p>
      <ul className="almond-plan__features">
        {features.map((feature, i) => (
          <li key={`${i}-${feature.label}`}>{feature.label}</li>
        ))}
      </ul>
      <a className="almond-plan__cta" href={cta.href}>
        {cta.label}
      </a>
    </article>
  );
}

export const planCardConfig: ComponentConfig<PlanCardProps> = {
  fields: {
    tier: { type: "text" },
    price: { type: "text" },
    period: { type: "text" },
    features: {
      type: "array",
      arrayFields: { label: { type: "text" } },
      defaultItemProps: { label: "New benefit" },
      getItemSummary: (item, i) =>
        (item.label as string) || `Benefit ${(i ?? 0) + 1}`,
    },
    cta: {
      type: "object",
      objectFields: {
        label: { type: "text" },
        href: { type: "text" },
      },
    },
    highlight: {
      type: "radio",
      options: [
        { label: "Featured", value: true },
        { label: "Standard", value: false },
      ],
    },
  },
  defaultProps: {
    tier: "Everyday",
    price: "Free",
    period: "forever",
    features: [
      { label: "No monthly fee" },
      { label: "Spend in any currency" },
      { label: "Instant notifications" },
    ],
    cta: { label: "Open an account", href: "#" },
    highlight: false,
  },
  render: ({ tier, price, period, features, cta, highlight }) => (
    <PlanCard
      tier={tier}
      price={price}
      period={period}
      features={features}
      cta={cta}
      highlight={highlight}
    />
  ),
};
