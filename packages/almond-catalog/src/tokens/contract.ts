/**
 * The semantic token contract — the ONE surface components are allowed to touch.
 *
 * Frozen at 13 tokens + 2 font tokens (sp-64 §2.2). Twelve are colours resolved
 * from the derived ramps; `--radius` is a scalar; the two font tokens are family
 * swaps. Components never reference a ramp step (`--accent-600`) or a raw colour —
 * only these names, via `hsl(var(--x))` for colours and `var(--x)` for the rest.
 *
 * shadcn's app-UI tokens (`--popover`, `--card-*`, `--input`, `--muted`) are
 * deliberately NOT here — pruned per the contract.
 */

export const COLOR_TOKENS = [
  "--background",
  "--surface",
  "--surface-muted",
  "--foreground",
  "--ink",
  "--muted-foreground",
  "--primary",
  "--primary-foreground",
  "--accent-wash",
  "--border",
  "--hairline",
  "--ring",
] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];

/** Scalar (non-colour) token — emitted as a raw CSS length, consumed as `var(--radius)`. */
export const SCALAR_TOKENS = ["--radius"] as const;

/** Family-swap tokens — emitted as font-family stacks, consumed as `var(--font-*)`. */
export const FONT_TOKENS = ["--font-display", "--font-body"] as const;

/** The full contract: every custom property a derived theme emits, in emit order. */
export const CONTRACT = [
  ...COLOR_TOKENS,
  ...SCALAR_TOKENS,
  ...FONT_TOKENS,
] as const;
export type Token = (typeof CONTRACT)[number];
