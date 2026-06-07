import { describe, it, expect } from "bun:test";
import { selectDisplay } from "./field-shell.js";

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
