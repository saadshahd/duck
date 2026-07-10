/**
 * The theme library — each theme is an INPUT BLOCK, not hand-authored values.
 *
 * Base `personal` / `business` differ on all three axes (accent, type, radius).
 * A `-{palette}` suffix overrides ACCENT ONLY, keeping the segment's type + radius.
 * One flat enum; the `{audience}[-{palette}]` naming convention is the deliverable.
 *
 * Seeds are PROVISIONAL (sp-64 §2.5 / T1 rider): refine exact hues and load real
 * editorial faces here once §2.8 production faces land. Type stacks below are the
 * sketch's system fallbacks (CSP blocks webfonts in the throwaway proof).
 */

export interface TypeFamily {
  readonly display: string;
  readonly body: string;
}

/** OKLCH accent seed — L·C·H. The derive-recipe grows the whole ramp from this. */
export interface AccentSeed {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

export interface ThemeInput {
  readonly label: string;
  readonly segment: "personal" | "business";
  readonly accent: AccentSeed;
  readonly radius: number;
  readonly type: TypeFamily;
}

const TYPE = {
  personal: {
    display:
      '"Iowan Old Style","Palatino Linotype","Book Antiqua",Palatino,Georgia,serif',
    body: 'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  },
  business: {
    display: 'Charter,Georgia,"Times New Roman",Times,serif',
    body: '"Helvetica Neue",Helvetica,Arial,system-ui,sans-serif',
  },
} as const satisfies Record<string, TypeFamily>;

export const THEMES = {
  personal: {
    label: "Personal",
    segment: "personal",
    accent: { l: 0.55, c: 0.095, h: 155 },
    radius: 14,
    type: TYPE.personal,
  },
  "personal-bright-green": {
    label: "Personal · Bright",
    segment: "personal",
    accent: { l: 0.6, c: 0.15, h: 148 },
    radius: 14,
    type: TYPE.personal,
  },
  "personal-forrest-green": {
    label: "Personal · Forrest",
    segment: "personal",
    accent: { l: 0.44, c: 0.085, h: 152 },
    radius: 14,
    type: TYPE.personal,
  },
  business: {
    label: "Business",
    segment: "business",
    accent: { l: 0.5, c: 0.105, h: 250 },
    radius: 6,
    type: TYPE.business,
  },
  "business-bright-blue": {
    label: "Business · Bright",
    segment: "business",
    accent: { l: 0.56, c: 0.15, h: 245 },
    radius: 6,
    type: TYPE.business,
  },
  // sp-64 §2.5 names this `business-forrest-blue`; the ⑤ sketch had a copy-paste
  // bug (a green H152 accent under the "forrest" business slot). Corrected here to
  // a deep, muted blue — an accent-only override that keeps the business type+radius.
  "business-forrest-blue": {
    label: "Business · Forrest",
    segment: "business",
    accent: { l: 0.42, c: 0.09, h: 255 },
    radius: 6,
    type: TYPE.business,
  },
} as const satisfies Record<string, ThemeInput>;

export type ThemeName = keyof typeof THEMES;

/** Deterministic order for emission and demo swatches. */
export const THEME_ORDER = [
  "personal",
  "personal-bright-green",
  "personal-forrest-green",
  "business",
  "business-bright-blue",
  "business-forrest-blue",
] as const satisfies readonly ThemeName[];

export const DEFAULT_THEME: ThemeName = "personal";
