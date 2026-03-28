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
    expect(selectEvent(hit("a"))).toEqual({ type: "SELECT", elementId: "a" });
  });

  it("null → DESELECT", () => {
    expect(selectEvent(null)).toEqual({ type: "DESELECT" });
  });
});
