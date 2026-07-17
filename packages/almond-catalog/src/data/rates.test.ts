import { describe, expect, test } from "bun:test";
import { CURRENCIES, resolveRate } from "./rates";

describe("resolveRate", () => {
  test("a currency against itself is 1", () => {
    expect(resolveRate("USD", "USD")).toBe(1);
  });

  test("a cross rate is the ratio of the two USD anchors", () => {
    // 1 USD = 0.79 GBP, so USD→GBP is 0.79.
    expect(resolveRate("USD", "GBP")).toBeCloseTo(0.79, 10);
  });

  test("the inverse pair is the reciprocal (round-trips to 1)", () => {
    const forward = resolveRate("USD", "GBP");
    const back = resolveRate("GBP", "USD");
    expect(forward).not.toBeNull();
    expect(back).not.toBeNull();
    expect((forward as number) * (back as number)).toBeCloseTo(1, 10);
  });

  test("an unknown currency yields null, never a guessed rate", () => {
    expect(resolveRate("USD", "XYZ")).toBeNull();
    expect(resolveRate("XYZ", "USD")).toBeNull();
  });

  test("every listed currency resolves against every other", () => {
    for (const from of CURRENCIES) {
      for (const to of CURRENCIES) {
        expect(resolveRate(from, to)).not.toBeNull();
      }
    }
  });
});
