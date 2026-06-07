import { describe, it, expect } from "bun:test";
import { isDismissible } from "./guards.js";

const nav = (pointer: string, lastSelectedId: string | null = "a") => ({
  data: { root: { props: {} }, content: [] },
  lastSelectedId,
  pointer,
});

describe("isDismissible", () => {
  it("selected with an element → dismissible", () => {
    expect(isDismissible(nav("selected"))).toBe(true);
  });

  it("editing → dismissible", () => {
    expect(isDismissible(nav("editing"))).toBe(true);
  });

  it("inserting → dismissible", () => {
    expect(isDismissible(nav("inserting"))).toBe(true);
  });

  it("slot-selected → dismissible", () => {
    expect(isDismissible(nav("slot-selected"))).toBe(true);
  });

  it("idle → not dismissible (editor must let Escape pass)", () => {
    expect(isDismissible(nav("idle", null))).toBe(false);
  });

  it("hovering with no selection → not dismissible", () => {
    expect(isDismissible(nav("hovering", null))).toBe(false);
  });
});
