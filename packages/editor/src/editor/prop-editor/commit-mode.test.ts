import { describe, it, expect } from "bun:test";
import {
  COMMIT,
  CONTINUOUS_DEBOUNCE_MS,
  type ControlId,
} from "./commit-mode.js";

const modeOf = (id: ControlId) => COMMIT[id].kind;

describe("COMMIT — commit-timing policy as data", () => {
  it("free-typing controls are continuous", () => {
    const continuous = (
      ["text", "textarea", "number", "richtext"] as const
    ).map(modeOf);
    expect(continuous).toEqual([
      "continuous",
      "continuous",
      "continuous",
      "continuous",
    ]);
  });

  it("click / pick / step controls are discrete (instant canvas)", () => {
    const discrete = (
      [
        "select",
        "radio",
        "segmented",
        "swatch",
        "dimension",
        "external",
        "array",
        "object",
        "slot",
        "custom",
      ] as const
    ).map(modeOf);
    expect(discrete.every((m) => m === "discrete")).toBe(true);
  });
});

describe("CONTINUOUS_DEBOUNCE_MS — single shared window", () => {
  it("is one window no continuous control may exceed", () => {
    expect(CONTINUOUS_DEBOUNCE_MS).toBe(300);
  });
});
