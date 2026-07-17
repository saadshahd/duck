/**
 * rates — the deterministic FX stub the RateWidget reads (sp-64 §6, map Fog).
 *
 * A demo stand-in for a live FX service: fixed USD-anchored rates, cross-rates derived by
 * division. Deterministic (no clock, no network) so the demo renders identically every run;
 * a live integration is post-v1 (map Fog). Resolution is TOTAL — an unknown currency yields
 * null so RateWidget shows an honest "rate unavailable" fallback, never a guessed number.
 */

export const CURRENCIES = ["USD", "EUR", "GBP", "AUD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Units of each currency per one USD — the anchor every cross-rate divides out of. */
const PER_USD = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.52,
} as const satisfies Record<Currency, number>;

function isCurrency(code: string): code is Currency {
  return Object.hasOwn(PER_USD, code);
}

/** Units of `to` per one unit of `from`; null when either currency is unknown. */
export function resolveRate(from: string, to: string): number | null {
  if (!isCurrency(from) || !isCurrency(to)) return null;
  return PER_USD[to] / PER_USD[from];
}
