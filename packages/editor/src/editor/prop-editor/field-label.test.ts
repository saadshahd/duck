import { describe, it, expect } from "bun:test";
import { humanizeLabel, toDisplayLabel } from "./field-label.js";

describe("humanizeLabel", () => {
  it("splits camelCase into sentence case", () => {
    expect(humanizeLabel("buttonText")).toBe("Button text");
  });

  it("splits snake_case into sentence case", () => {
    expect(humanizeLabel("margin_bottom")).toBe("Margin bottom");
  });

  it("splits kebab-case into sentence case", () => {
    expect(humanizeLabel("font-size")).toBe("Font size");
  });

  it("preserves an acronym as its own word", () => {
    expect(humanizeLabel("imageURL")).toBe("Image URL");
    expect(humanizeLabel("imageAlt")).toBe("Image alt");
  });

  it("sentence-cases a short lowercase key", () => {
    expect(humanizeLabel("id")).toBe("Id");
  });

  it("normalizes an already-spaced key to sentence case", () => {
    expect(humanizeLabel("Button Text")).toBe("Button text");
  });

  it("capitalizes a single word", () => {
    expect(humanizeLabel("variant")).toBe("Variant");
  });

  it("returns an empty string for an empty key", () => {
    expect(humanizeLabel("")).toBe("");
  });

  it("handles a deeply nested camelCase key", () => {
    expect(humanizeLabel("marginBottom")).toBe("Margin bottom");
  });
});

describe("toDisplayLabel", () => {
  it("prefers an explicit override over the derived key", () => {
    expect(toDisplayLabel("buttonText", "Call to action")).toBe(
      "Call to action",
    );
  });

  it("never transforms the explicit override", () => {
    expect(toDisplayLabel("buttonText", "CTA Label")).toBe("CTA Label");
  });

  it("falls back to humanizing the key when no override is given", () => {
    expect(toDisplayLabel("buttonText")).toBe("Button text");
  });
});
