import { describe, it, expect } from "bun:test";
import { isDismissible, tabNavigable } from "./guards.js";

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

describe("tabNavigable", () => {
  it("idle → Tab may navigate", () => {
    expect(tabNavigable(nav("idle", null))).toBe(true);
  });

  it("hovering → Tab may navigate", () => {
    expect(tabNavigable(nav("hovering", null))).toBe(true);
  });

  it("selected → Tab may navigate (sibling walk)", () => {
    expect(tabNavigable(nav("selected"))).toBe(true);
  });

  it("editing → Tab must not be intercepted (picker/sheet controls need it)", () => {
    expect(tabNavigable(nav("editing"))).toBe(false);
  });

  it("inserting → Tab must not be intercepted (catalog picker needs it)", () => {
    expect(tabNavigable(nav("inserting"))).toBe(false);
  });
});
