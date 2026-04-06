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
    expect(selectEvent(hit("a"), false)).toEqual({
      type: "SELECT",
      elementId: "a",
    });
  });

  it("hit + multi → TOGGLE_SELECT", () => {
    expect(selectEvent(hit("a"), true)).toEqual({
      type: "TOGGLE_SELECT",
      elementId: "a",
    });
  });

  it("null → DESELECT", () => {
    expect(selectEvent(null, false)).toEqual({ type: "DESELECT" });
  });

  it("null + multi → DESELECT", () => {
    expect(selectEvent(null, true)).toEqual({ type: "DESELECT" });
  });
});
