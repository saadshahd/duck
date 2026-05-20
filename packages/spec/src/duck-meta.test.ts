import { describe, it, expect } from "bun:test";
import { getSlotMeta, isSlotOptional, type DuckMeta } from "./duck-meta.js";

const meta: DuckMeta = {
  Hero: {
    slots: {
      figure: {},
      content: {},
      footer: { optional: true },
    },
  },
  Card: {
    slots: {
      children: { optional: false },
    },
  },
  NoSlots: {},
};

describe("getSlotMeta", () => {
  it("returns slot meta when defined", () => {
    expect(getSlotMeta(meta, "Hero", "footer")).toEqual({ optional: true });
  });

  it("returns slot meta with no flags", () => {
    expect(getSlotMeta(meta, "Hero", "figure")).toEqual({});
  });

  it("returns undefined for unknown slot", () => {
    expect(getSlotMeta(meta, "Hero", "missing")).toBeUndefined();
  });

  it("returns undefined for unknown component", () => {
    expect(getSlotMeta(meta, "Missing", "footer")).toBeUndefined();
  });

  it("returns undefined when meta is undefined", () => {
    expect(getSlotMeta(undefined, "Hero", "footer")).toBeUndefined();
  });

  it("returns undefined when component has no slots", () => {
    expect(getSlotMeta(meta, "NoSlots", "x")).toBeUndefined();
  });
});

describe("isSlotOptional", () => {
  it("true when explicitly optional", () => {
    expect(isSlotOptional(meta, "Hero", "footer")).toBe(true);
  });

  it("false when explicitly not optional", () => {
    expect(isSlotOptional(meta, "Card", "children")).toBe(false);
  });

  it("false when slot has no optional flag", () => {
    expect(isSlotOptional(meta, "Hero", "figure")).toBe(false);
  });

  it("false for unknown slot", () => {
    expect(isSlotOptional(meta, "Hero", "missing")).toBe(false);
  });

  it("false for unknown component", () => {
    expect(isSlotOptional(meta, "Missing", "x")).toBe(false);
  });

  it("false when meta is undefined", () => {
    expect(isSlotOptional(undefined, "Hero", "footer")).toBe(false);
  });
});
