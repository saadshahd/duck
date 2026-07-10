/**
 * Enforcement layer (c) — the theme-derive test (sp-64 §2.6.3).
 *
 * For every registered theme, run `deriveTheme` and assert:
 *   - the emitted key-set === the contract, in BOTH modes (no leak, no gap);
 *   - every audited pair holds AA (≥ 4.5) after the directional nudge.
 *
 * Adding a theme = a new value block + an enum entry, nothing else — this test is
 * what keeps that promise honest.
 */

import { describe, expect, test } from "bun:test";
import { CONTRACT } from "./contract";
import { AA_MIN, deriveTheme } from "./derive";
import { THEME_ORDER } from "./themes";

const CONTRACT_KEYS = [...CONTRACT].sort();

describe("deriveTheme", () => {
  for (const name of THEME_ORDER) {
    describe(name, () => {
      const derived = deriveTheme(name);

      for (const mode of ["light", "dark"] as const) {
        test(`${mode}: emitted keys === contract`, () => {
          expect(Object.keys(derived[mode].vars).sort()).toEqual(CONTRACT_KEYS);
        });

        test(`${mode}: every audited pair holds AA`, () => {
          const ratios = Object.entries(derived[mode].aa);
          expect(ratios.length).toBeGreaterThan(0);
          for (const [pair, ratio] of ratios) {
            expect(ratio, `${name} ${mode} ${pair}`).toBeGreaterThanOrEqual(
              AA_MIN,
            );
          }
        });

        test(`${mode}: colour tokens are plain "H S% L%" triplets`, () => {
          // colours only — radius/fonts are raw values, not triplets
          const triplet = /^-?\d+(\.\d+)?\s-?\d+(\.\d+)?%\s-?\d+(\.\d+)?%$/;
          expect(derived[mode].vars["--primary"]).toMatch(triplet);
          expect(derived[mode].vars["--background"]).toMatch(triplet);
        });
      }
    });
  }

  test("theme = one input block: forkability holds across the whole set", () => {
    // Every theme derives without throwing (AlmondAAError is fail-loud on an
    // unsatisfiable seed) and produces the same contract surface.
    const surfaces = THEME_ORDER.map((n) =>
      Object.keys(deriveTheme(n).light.vars).sort(),
    );
    for (const keys of surfaces) expect(keys).toEqual(CONTRACT_KEYS);
  });
});
