import { describe, it, expect } from "bun:test";
import type { Hit } from "../fiber/index.js";
import { hoverEvent, selectEvent } from "./use-selection.js";

const elementHit = (id: string): Hit => ({ kind: "element", elementId: id });
const slotHit = (parentId: string, slotKey: string): Hit => ({
  kind: "slot",
  parentId,
  slotKey,
});

describe("hoverEvent", () => {
  it("element hit → HOVER target", () => {
    expect(hoverEvent(elementHit("a"))).toEqual({
      type: "HOVER",
      target: { kind: "element", elementId: "a" },
    });
  });

  it("slot hit → HOVER target", () => {
    expect(hoverEvent(slotHit("p", "footer"))).toEqual({
      type: "HOVER",
      target: { kind: "slot", parentId: "p", slotKey: "footer" },
    });
  });

  it("null → HOVER null", () => {
    expect(hoverEvent(null)).toEqual({ type: "HOVER", target: null });
  });
});

describe("selectEvent", () => {
  it("element hit → SELECT target", () => {
    expect(selectEvent(elementHit("a"))).toEqual({
      type: "SELECT",
      target: { kind: "element", elementId: "a" },
    });
  });

  it("slot hit → SELECT target", () => {
    expect(selectEvent(slotHit("p", "footer"))).toEqual({
      type: "SELECT",
      target: { kind: "slot", parentId: "p", slotKey: "footer" },
    });
  });

  it("null → DESELECT", () => {
    expect(selectEvent(null)).toEqual({ type: "DESELECT" });
  });
});
