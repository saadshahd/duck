import { describe, it, expect } from "bun:test";
import {
  transitionHover,
  transitionSelect,
  type EditorSelection,
} from "./use-selection.js";

// rect is opaque to the transition functions — plain object suffices
const rect = { x: 0, y: 0, width: 100, height: 50 } as unknown as DOMRect;
const hit = (id: string) => ({ elementId: id, rect });

const idle: EditorSelection = { tag: "idle" };
const hovering = (id: string): EditorSelection => ({
  tag: "hovering",
  elementId: id,
  rect,
});
const selected = (id: string): EditorSelection => ({
  tag: "selected",
  elementId: id,
  rect,
});

// --- Exhaustive state × input for transitionHover ---

describe("transitionHover", () => {
  // idle
  it("idle + null → idle", () => {
    expect(transitionHover(idle, null)).toEqual(idle);
  });

  it("idle + hit → hovering", () => {
    expect(transitionHover(idle, hit("a"))).toEqual(hovering("a"));
  });

  // hovering
  it("hovering + null → idle", () => {
    expect(transitionHover(hovering("a"), null)).toEqual(idle);
  });

  it("hovering + same element → same reference", () => {
    const prev = hovering("a");
    expect(transitionHover(prev, hit("a"))).toBe(prev);
  });

  it("hovering + different element → new hovering", () => {
    expect(transitionHover(hovering("a"), hit("b"))).toEqual(hovering("b"));
  });

  // selected — hover never overrides selection
  it("selected + null → stays selected", () => {
    const prev = selected("a");
    expect(transitionHover(prev, null)).toBe(prev);
  });

  it("selected + any hit → stays selected", () => {
    const prev = selected("a");
    expect(transitionHover(prev, hit("b"))).toBe(prev);
  });

  it("selected + same hit → stays selected", () => {
    const prev = selected("a");
    expect(transitionHover(prev, hit("a"))).toBe(prev);
  });
});

// --- Exhaustive state × input for transitionSelect ---

describe("transitionSelect", () => {
  it("idle + hit → selected", () => {
    expect(transitionSelect(idle, hit("a"))).toEqual(selected("a"));
  });

  it("hovering + hit → selected", () => {
    expect(transitionSelect(hovering("x"), hit("a"))).toEqual(selected("a"));
  });

  it("selected + different hit → new selected", () => {
    expect(transitionSelect(selected("a"), hit("b"))).toEqual(selected("b"));
  });

  // null always clears to idle regardless of previous state
  it("idle + null → idle", () => {
    expect(transitionSelect(idle, null)).toEqual(idle);
  });

  it("hovering + null → idle", () => {
    expect(transitionSelect(hovering("a"), null)).toEqual(idle);
  });

  it("selected + null → idle", () => {
    expect(transitionSelect(selected("a"), null)).toEqual(idle);
  });
});
