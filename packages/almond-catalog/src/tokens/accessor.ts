/**
 * The typed token accessor — enforcement layer (a) of sp-64 §2.6.
 *
 * Components read tokens through `t.foreground`, never a bare `var(--…)` string in
 * TS. The camelCase key set is DERIVED from the contract via template-literal types,
 * so a misspelled or off-contract member is a compile error, and a missing or extra
 * member trips the `satisfies` check below. Colours carry the `hsl(var(--x))` wrapper;
 * scalar and font tokens are raw `var(--x)`.
 */

import type { Token } from "./contract";

type CamelBody<S extends string> = S extends `${infer H}-${infer T}`
  ? `${H}${Capitalize<CamelBody<T>>}`
  : S;
type Camel<S extends string> = S extends `--${infer Rest}`
  ? CamelBody<Rest>
  : never;

/** camelCase name for every contract token (`--muted-foreground` → `mutedForeground`). */
export type TokenName = Camel<Token>;

export const t = {
  background: "hsl(var(--background))",
  surface: "hsl(var(--surface))",
  surfaceMuted: "hsl(var(--surface-muted))",
  foreground: "hsl(var(--foreground))",
  ink: "hsl(var(--ink))",
  mutedForeground: "hsl(var(--muted-foreground))",
  primary: "hsl(var(--primary))",
  primaryForeground: "hsl(var(--primary-foreground))",
  accentWash: "hsl(var(--accent-wash))",
  border: "hsl(var(--border))",
  hairline: "hsl(var(--hairline))",
  ring: "hsl(var(--ring))",
  radius: "var(--radius)",
  fontDisplay: "var(--font-display)",
  fontBody: "var(--font-body)",
} satisfies Record<TokenName, string>;
