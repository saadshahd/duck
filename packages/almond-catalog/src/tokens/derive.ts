/**
 * The derive-recipe (sp-64 §2.3 / ⑤ locked) — one ramp per theme, in OKLCH via
 * culori. Two ramps grow from a theme's input block:
 *
 *   accent  — the seed's hue at a FROZEN lightness skeleton shared across every
 *             theme (the visible "one system" proof), with a per-step chroma taper
 *             so the ends never neon.
 *   neutral — low-chroma greys TINTED toward the accent hue: editorial "warm paper".
 *
 * A single FROZEN semantic mapping table (role → ramp step) with a light column and
 * a dark column picking different steps yields the theme×mode matrix from one ramp.
 * AA is auto-nudged per-pair directionally, then values are gamut-clamped and emitted
 * as plain `hsl(H S% L%)` triplets (consumed via `hsl(var(--x))`).
 */

import { clampChroma, hsl, wcagContrast } from "culori";
import {
  COLOR_TOKENS,
  FONT_TOKENS,
  SCALAR_TOKENS,
  type ColorToken,
  type Token,
} from "./contract";
import { THEMES, THEME_ORDER, type ThemeInput, type ThemeName } from "./themes";

type Mode = "light" | "dark";
interface Oklch {
  mode: "oklch";
  l: number;
  c: number;
  h: number;
}

export const AA_MIN = 4.5;

export class AlmondAAError extends Error {
  constructor(
    readonly theme: ThemeName,
    readonly mode: Mode,
    readonly pair: string,
    readonly ratio: number,
  ) {
    super(
      `[Almond AA] ${theme} ${mode} ${pair} = ${ratio.toFixed(2)} < ${AA_MIN} — unsatisfiable`,
    );
    this.name = "AlmondAAError";
  }
}

/* --------------------------------------------------------------------------
   Ramp skeletons — shared across every theme (this is what makes it "one system")
   -------------------------------------------------------------------------- */

// Frozen accent lightness skeleton.
const ACCENT_L: Record<number, number> = {
  50: 0.972,
  100: 0.945,
  200: 0.895,
  300: 0.83,
  400: 0.74,
  500: 0.66,
  600: 0.585,
  700: 0.5,
  800: 0.41,
  900: 0.32,
};
// Chroma taper: full at mid, pulled in at the light/dark extremes so it never neons.
const ACCENT_C_TAPER: Record<number, number> = {
  50: 0.14,
  100: 0.26,
  200: 0.45,
  300: 0.68,
  400: 0.9,
  500: 1,
  600: 1,
  700: 0.92,
  800: 0.78,
  900: 0.62,
};

// Frozen neutral lightness skeleton — warm paper at the top, deep ink at the bottom.
const NEUTRAL_L: Record<number, number> = {
  0: 1.0,
  50: 0.986,
  100: 0.967,
  150: 0.948,
  200: 0.917,
  300: 0.86,
  400: 0.74,
  500: 0.6,
  600: 0.49,
  700: 0.395,
  800: 0.3,
  850: 0.245,
  900: 0.19,
  950: 0.145,
};

// A whisper of accent chroma in the neutrals — strongest in the pale paper and the
// deep inks, faintest through the mid greys.
function neutralChroma(step: number): number {
  if (step <= 100) return 0.01;
  if (step <= 300) return 0.008;
  if (step <= 700) return 0.006;
  return 0.01;
}

interface Ramps {
  accent: Record<number, Oklch>;
  neutral: Record<number, Oklch>;
}

function buildRamps(theme: ThemeInput): Ramps {
  const h = theme.accent.h;
  const accent: Record<number, Oklch> = {};
  const neutral: Record<number, Oklch> = {};
  for (const step of Object.keys(ACCENT_L).map(Number)) {
    accent[step] = {
      mode: "oklch",
      l: ACCENT_L[step],
      c: theme.accent.c * ACCENT_C_TAPER[step],
      h,
    };
  }
  for (const step of Object.keys(NEUTRAL_L).map(Number)) {
    neutral[step] = {
      mode: "oklch",
      l: NEUTRAL_L[step],
      c: neutralChroma(step),
      h,
    };
  }
  return { accent, neutral };
}

/* --------------------------------------------------------------------------
   Frozen semantic mapping: role → ramp step. The SAME table for every theme.
   A theme that re-maps roles is a leak (③ A2 forkability test).
   -------------------------------------------------------------------------- */

type Ref = ["a" | "n", number];
const SEMANTIC: Record<Mode, Record<ColorToken, Ref>> = {
  light: {
    "--background": ["n", 50],
    "--surface": ["n", 0],
    "--surface-muted": ["n", 100],
    "--foreground": ["n", 900],
    "--ink": ["n", 950],
    "--muted-foreground": ["n", 500],
    "--primary": ["a", 600],
    "--primary-foreground": ["n", 50],
    "--accent-wash": ["a", 100],
    "--border": ["n", 200],
    "--hairline": ["n", 150],
    "--ring": ["a", 500],
  },
  dark: {
    "--background": ["n", 950],
    "--surface": ["n", 900],
    "--surface-muted": ["n", 850],
    "--foreground": ["n", 100],
    "--ink": ["n", 50],
    "--muted-foreground": ["n", 400],
    "--primary": ["a", 400],
    "--primary-foreground": ["n", 950],
    "--accent-wash": ["a", 900],
    "--border": ["n", 800],
    "--hairline": ["n", 850],
    "--ring": ["a", 400],
  },
};

function resolve(mode: Mode, ramps: Ramps): Record<ColorToken, Oklch> {
  const out = {} as Record<ColorToken, Oklch>;
  for (const token of COLOR_TOKENS) {
    const [which, step] = SEMANTIC[mode][token];
    const src = (which === "a" ? ramps.accent : ramps.neutral)[step];
    out[token] = { mode: "oklch", l: src.l, c: src.c, h: src.h }; // mutable copy for the AA nudge
  }
  return out;
}

/* --------------------------------------------------------------------------
   AA auto-nudge — per-pair directional (sp-64 §2.4). The *adjustable* token moves:
   text darkens against a fixed ground; the primary FILL darkens because its white
   foreground can't get any lighter. Contrast is measured on the gamut-clamped colour
   the browser will actually paint.
   -------------------------------------------------------------------------- */

interface AuditPair {
  pair: [ColorToken, ColorToken];
  adjust: ColorToken;
}
const AUDIT: readonly AuditPair[] = [
  { pair: ["--foreground", "--background"], adjust: "--foreground" },
  {
    pair: ["--muted-foreground", "--background"],
    adjust: "--muted-foreground",
  },
  { pair: ["--primary-foreground", "--primary"], adjust: "--primary" },
];

function contrast(a: Oklch, b: Oklch): number {
  return wcagContrast(clampChroma(a, "oklch"), clampChroma(b, "oklch"));
}

function nudgeToAA(adj: Oklch, ref: Oklch): number {
  let guard = 0;
  while (contrast(adj, ref) < AA_MIN && guard++ < 80) {
    adj.l += adj.l > ref.l ? 0.008 : -0.008;
    if (adj.l <= 0 || adj.l >= 1) {
      adj.l = Math.min(1, Math.max(0, adj.l));
      break;
    }
  }
  return contrast(adj, ref);
}

/* --------------------------------------------------------------------------
   OKLCH → sRGB → plain `H S% L%` triplet (gamut-clamped).
   -------------------------------------------------------------------------- */

const round = (n: number, d = 1): number => Number(n.toFixed(d));

export function hslTriplet(color: Oklch): string {
  const { h = 0, s = 0, l = 0 } = hsl(clampChroma(color, "oklch"));
  return `${round(h)} ${round(s * 100)}% ${round(l * 100)}%`;
}

/* --------------------------------------------------------------------------
   deriveTheme — the public engine entry.
   -------------------------------------------------------------------------- */

export interface ThemeMode {
  /** Every contract token → emitted value (colours as `H S% L%`, radius/fonts raw). */
  vars: Record<Token, string>;
  /** Audited pair (`--a/--b`) → achieved WCAG ratio, post-nudge. */
  aa: Record<string, number>;
}

export interface DerivedTheme {
  name: ThemeName;
  light: ThemeMode;
  dark: ThemeMode;
}

function deriveMode(
  name: ThemeName,
  theme: ThemeInput,
  mode: Mode,
  ramps: Ramps,
): ThemeMode {
  const colors = resolve(mode, ramps);
  const aa: Record<string, number> = {};
  for (const { pair, adjust } of AUDIT) {
    const ref = pair[0] === adjust ? pair[1] : pair[0];
    const ratio = round(nudgeToAA(colors[adjust], colors[ref]), 2);
    aa[pair.join("/")] = ratio;
    if (ratio < AA_MIN)
      throw new AlmondAAError(name, mode, pair.join("/"), ratio);
  }

  const vars = {} as Record<Token, string>;
  for (const token of COLOR_TOKENS) vars[token] = hslTriplet(colors[token]);
  vars[SCALAR_TOKENS[0]] = `${theme.radius}px`;
  vars[FONT_TOKENS[0]] = theme.type.display;
  vars[FONT_TOKENS[1]] = theme.type.body;
  return { vars, aa };
}

export function deriveTheme(name: ThemeName): DerivedTheme {
  const theme = THEMES[name];
  const ramps = buildRamps(theme);
  return {
    name,
    light: deriveMode(name, theme, "light", ramps),
    dark: deriveMode(name, theme, "dark", ramps),
  };
}

export function deriveAll(): DerivedTheme[] {
  return THEME_ORDER.map(deriveTheme);
}
