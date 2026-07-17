import { describe, expect, test } from "bun:test";
import { disclosures, resolveDisclosures } from "./disclosures";

describe("resolveDisclosures", () => {
  test("resolves known ids to their approved snippets, preserving order", () => {
    expect(resolveDisclosures(["aer", "deposits"])).toEqual([
      disclosures.aer,
      disclosures.deposits,
    ]);
  });

  test("silently drops unknown ids rather than inventing a snippet", () => {
    expect(resolveDisclosures(["deposits", "ghost", "fx"])).toEqual([
      disclosures.deposits,
      disclosures.fx,
    ]);
  });

  test("an empty selection resolves to no snippets", () => {
    expect(resolveDisclosures([])).toEqual([]);
  });
});
