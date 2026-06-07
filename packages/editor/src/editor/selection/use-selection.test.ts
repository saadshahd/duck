import { describe, it, expect } from "bun:test";
import { hoverEvent, selectEvent } from "./use-selection.js";

const hit = (id: string) => ({ elementId: id });

describe("hoverEvent", () => {
  it("hit → HOVER", () => {
    expect(hoverEvent(hit("a"))).toEqual({ type: "HOVER", elementId: "a" });
  });

  it("null → UNHOVER", () => {
    expect(hoverEvent(null)).toEqual({ type: "UNHOVER" });
  });
});

describe("selectEvent", () => {
  it("hit → SELECT", () => {
    expect(selectEvent(hit("a"), { multi: false, sheetOpen: false })).toEqual({
      type: "SELECT",
      elementId: "a",
    });
  });

  it("hit + multi → TOGGLE_SELECT", () => {
    expect(selectEvent(hit("a"), { multi: true, sheetOpen: false })).toEqual({
      type: "TOGGLE_SELECT",
      elementId: "a",
    });
  });

  it("hit + sheetOpen → SELECT (re-target wins over close)", () => {
    expect(selectEvent(hit("a"), { multi: false, sheetOpen: true })).toEqual({
      type: "SELECT",
      elementId: "a",
    });
  });

  it("null + sheetOpen → CANCEL_EDIT (close, keep selection)", () => {
    expect(selectEvent(null, { multi: false, sheetOpen: true })).toEqual({
      type: "CANCEL_EDIT",
    });
  });

  it("null, no sheet → DESELECT", () => {
    expect(selectEvent(null, { multi: false, sheetOpen: false })).toEqual({
      type: "DESELECT",
    });
  });
});
