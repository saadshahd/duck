import { describe, it, expect } from "bun:test";
import { isCssColor, toPickerHex } from "./color-parse.js";

describe("isCssColor", () => {
  it("accepts named colors", () => {
    expect(isCssColor("red")).toBe(true);
    expect(isCssColor("rebeccapurple")).toBe(true);
  });

  it("accepts 6-digit and 3-digit hex", () => {
    expect(isCssColor("#ff6b35")).toBe(true);
    expect(isCssColor("#FF6B35")).toBe(true);
    expect(isCssColor("#f60")).toBe(true);
  });

  it("accepts functional notation", () => {
    expect(isCssColor("rgb(255, 107, 53)")).toBe(true);
  });

  it("accepts surrounding whitespace around a valid color", () => {
    expect(isCssColor("  #ff6b35  ")).toBe(true);
  });

  it("rejects empty and whitespace-only strings", () => {
    expect(isCssColor("")).toBe(false);
    expect(isCssColor("   ")).toBe(false);
  });

  it("rejects non-color words", () => {
    expect(isCssColor("not-a-color")).toBe(false);
  });

  it("rejects malformed hex (5 digits)", () => {
    expect(isCssColor("#ff6b3")).toBe(false);
  });

  it("rejects values from other CSS grammars", () => {
    expect(isCssColor("12px")).toBe(false);
  });
});

describe("toPickerHex", () => {
  it("passes a #rrggbb literal through (trimmed, case preserved)", () => {
    expect(toPickerHex("#ff6b35")).toBe("#ff6b35");
    expect(toPickerHex(" #FF6B35 ")).toBe("#FF6B35");
  });

  it("returns undefined for anything the native picker cannot seed", () => {
    expect(toPickerHex("red")).toBeUndefined();
    expect(toPickerHex("#f60")).toBeUndefined();
    expect(toPickerHex("rgb(255, 0, 0)")).toBeUndefined();
    expect(toPickerHex("")).toBeUndefined();
  });
});
