import { test, expect, describe } from "bun:test";
import { parseLeadingNumber } from "./dimension-parse.js";

describe("parseLeadingNumber", () => {
  test("rem dimension", () => expect(parseLeadingNumber("1.5rem")).toBe(1.5));
  test("px dimension", () => expect(parseLeadingNumber("9999px")).toBe(9999));
  test("unitless zero", () => expect(parseLeadingNumber("0")).toBe(0));
  test("compound leading token", () =>
    expect(parseLeadingNumber("0 auto")).toBe(0));
  test("compound with unit leading token", () =>
    expect(parseLeadingNumber("1rem 0")).toBe(1));
  test("empty string", () => expect(parseLeadingNumber("")).toBeUndefined());
  test("text-only (auto)", () =>
    expect(parseLeadingNumber("auto")).toBeUndefined());
  test("small float", () => expect(parseLeadingNumber("0.75rem")).toBe(0.75));
  test("negative value", () =>
    expect(parseLeadingNumber("-0.5rem")).toBe(-0.5));
  test("integer px", () => expect(parseLeadingNumber("320px")).toBe(320));
});
