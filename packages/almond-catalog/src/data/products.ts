/**
 * products — the content-team-owned product reference (sp-64 §6).
 *
 * NOT a general content-reference mechanism (① forbids that): a hard-coded, shared
 * source of truth that ProductSummary is the ONLY consumer of, keyed by a stable id
 * the editor picks through a semantic `productId` select — never free authoring. This
 * keeps "visibly one reference" across every context a product appears in.
 *
 * Resolution is TOTAL: an unknown id yields null so the consumer renders a labeled
 * placeholder instead of crashing (the dangling-ref state is finished in T12).
 */

export interface Product {
  name: string;
  blurb: string;
  price: string;
  icon: string;
  href: string;
}

export const products = {
  everyday: {
    name: "Almond Everyday",
    blurb:
      "Your day-to-day account. Spend, get paid, and see exactly where it goes.",
    price: "Free",
    icon: "◐",
    href: "#",
  },
  interest: {
    name: "Almond Interest",
    blurb:
      "Put idle cash to work at a rate that actually moves — paid daily, withdraw anytime.",
    price: "4.1% AER",
    icon: "◆",
    href: "#",
  },
  send: {
    name: "Almond Send",
    blurb:
      "Move money abroad at the real exchange rate. No markup buried in the numbers.",
    price: "No FX markup",
    icon: "➤",
    href: "#",
  },
  card: {
    name: "Almond Card",
    blurb: "One card, spent in any currency, always at the honest rate.",
    price: "Free",
    icon: "▢",
    href: "#",
  },
} as const satisfies Record<string, Product>;

export type ProductId = keyof typeof products;

/** Resolve a (possibly foreign) id against the reference; misses return null, never throw. */
export function resolveProduct(id: string): Product | null {
  return Object.hasOwn(products, id) ? products[id as ProductId] : null;
}
