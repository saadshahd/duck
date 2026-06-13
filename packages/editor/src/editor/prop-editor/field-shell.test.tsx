import { describe, it, expect } from "bun:test";
import { selectDisplay, resolveValueMode } from "./field-shell.js";

const opts = [
  { value: "h1", label: "H1" },
  { value: "h2", label: "H2" },
];

describe("selectDisplay", () => {
  it("unset value → isUnset true, display empty", () => {
    expect(selectDisplay(undefined, opts)).toEqual({
      isUnset: true,
      display: "",
    });
  });

  it("value matching an option → isUnset false, display that value", () => {
    expect(selectDisplay("h2", opts)).toEqual({
      isUnset: false,
      display: "h2",
    });
  });

  it("value not in options → isUnset true", () => {
    expect(selectDisplay("h9", opts)).toEqual({
      isUnset: true,
      display: "",
    });
  });

  it("explicit empty-string option → empty value is set, not unset", () => {
    const withNone = [{ value: "", label: "None" }, ...opts];
    expect(selectDisplay("", withNone)).toEqual({
      isUnset: false,
      display: "",
    });
  });

  it("number value matching a numeric option → set", () => {
    const numeric = [{ value: 1, label: "One" }];
    expect(selectDisplay(1, numeric)).toEqual({
      isUnset: false,
      display: "1",
    });
  });
});

describe("resolveValueMode", () => {
  const presets = ["sm", "md", "lg"];

  it("undefined → unset", () => {
    expect(resolveValueMode(undefined, presets)).toEqual({ mode: "unset" });
  });

  it("empty string → unset", () => {
    expect(resolveValueMode("", presets)).toEqual({ mode: "unset" });
  });

  it("value in presets → preset with key", () => {
    expect(resolveValueMode("md", presets)).toEqual({
      mode: "preset",
      key: "md",
    });
  });

  it("non-empty value not in presets → literal", () => {
    expect(resolveValueMode("16px", presets)).toEqual({
      mode: "literal",
      value: "16px",
    });
  });

  it("number value matching a preset string → preset", () => {
    expect(resolveValueMode(42, ["42"])).toEqual({ mode: "preset", key: "42" });
  });

  it("number value not in presets → literal", () => {
    expect(resolveValueMode(99, ["42"])).toEqual({
      mode: "literal",
      value: "99",
    });
  });
});
