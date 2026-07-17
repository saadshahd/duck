import { describe, expect, test } from "bun:test";
import { comparisons, resolveComparison } from "./comparisons";

describe("resolveComparison", () => {
  test("resolves a known set with its competitors and one marked Almond", () => {
    const resolved = resolveComparison("send");
    expect(resolved?.label).toBe(comparisons.send.label);
    expect(
      resolved?.competitors.filter((c) => c.isAlmond).map((c) => c.id),
    ).toEqual(["almond"]);
  });

  test("a goal lenses the capability rows down to the ids it foregrounds", () => {
    const resolved = resolveComparison("send", "transparency");
    expect(resolved?.capabilities.map((cap) => cap.id)).toEqual([
      "realRate",
      "noMarkup",
    ]);
  });

  test("an unrecognized goal falls back to the full capability set", () => {
    const resolved = resolveComparison("send", "not-a-goal");
    expect(resolved?.capabilities.map((cap) => cap.id)).toEqual(
      comparisons.send.capabilities.map((cap) => cap.id),
    );
  });

  test("verdictOf returns the approved verdict for a populated cell", () => {
    const resolved = resolveComparison("send");
    expect(resolved?.verdictOf("bank", "realRate")).toBe("no");
    expect(resolved?.verdictOf("almond", "weekend")).toBe("yes");
  });

  test("verdictOf returns null for an absent cell, never a guessed verdict", () => {
    const resolved = resolveComparison("send");
    expect(resolved?.verdictOf("ghost", "realRate")).toBeNull();
  });

  test("an unknown set yields null, never throws", () => {
    expect(resolveComparison("ghost-set")).toBeNull();
  });
});
