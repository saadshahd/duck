/**
 * Enforcement layer (a) — runtime witness for the typed accessor (sp-64 §2.6.1).
 *
 * The compile-time guard is the `satisfies Record<TokenName, string>` in accessor.ts;
 * a non-contract member won't type-check. This test additionally pins the accessor's
 * key-set to the contract and checks each value wraps the right token: colours as
 * `hsl(var(--x))`, scalar/font tokens as raw `var(--x)`.
 */

import { describe, expect, test } from "bun:test";
import { t } from "./accessor";
import { COLOR_TOKENS, CONTRACT } from "./contract";

const camel = (token: string) =>
  token
    .replace(/^--/, "")
    .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

describe("token accessor", () => {
  test("keys === contract (camelCased)", () => {
    expect(Object.keys(t).sort()).toEqual(CONTRACT.map(camel).sort());
  });

  test("colour tokens carry the hsl() wrapper; scalar/font tokens do not", () => {
    const colorKeys = new Set(COLOR_TOKENS.map(camel));
    for (const [key, value] of Object.entries(t)) {
      if (colorKeys.has(key))
        expect(value).toMatch(/^hsl\(var\(--[a-z-]+\)\)$/);
      else expect(value).toMatch(/^var\(--[a-z-]+\)$/);
    }
  });
});
