import { describe, it, expect } from "bun:test";
import { Selection, type SelectionState } from "./selection-model.js";

const state = (
  ids: string[],
  last: string | null = ids.at(-1) ?? null,
): SelectionState => ({
  selectedIds: new Set(ids),
  lastSelectedId: last,
});

describe("Selection.of", () => {
  it("creates singleton set with lastSelectedId", () => {
    const s = Selection.of("a");
    expect(s.selectedIds).toEqual(new Set(["a"]));
    expect(s.lastSelectedId).toBe("a");
  });
});

describe("Selection.clear", () => {
  it("returns empty set and null last", () => {
    const s = Selection.clear();
    expect(s.selectedIds.size).toBe(0);
    expect(s.lastSelectedId).toBeNull();
  });

  it("returns same reference", () => {
    expect(Selection.clear()).toBe(Selection.clear());
  });
});

describe("Selection.toggle", () => {
  it("adds element to set", () => {
    const s = Selection.toggle(state(["a"]), "b");
    expect(s.selectedIds).toEqual(new Set(["a", "b"]));
    expect(s.lastSelectedId).toBe("b");
  });

  it("removes element from set", () => {
    const s = Selection.toggle(state(["a", "b"]), "a");
    expect(s.selectedIds).toEqual(new Set(["b"]));
    expect(s.lastSelectedId).toBe("b");
  });

  it("preserves lastSelectedId on remove", () => {
    const s = Selection.toggle(state(["a", "b"], "b"), "a");
    expect(s.lastSelectedId).toBe("b");
  });

  it("adds to empty set", () => {
    const s = Selection.toggle(state([]), "a");
    expect(s.selectedIds).toEqual(new Set(["a"]));
    expect(s.lastSelectedId).toBe("a");
  });
});

describe("Selection.collapseToLast", () => {
  it("returns singleton of lastSelectedId", () => {
    const s = Selection.collapseToLast(state(["a", "b"], "b"));
    expect(s.selectedIds).toEqual(new Set(["b"]));
    expect(s.lastSelectedId).toBe("b");
  });

  it("returns clear when lastSelectedId is null", () => {
    const s = Selection.collapseToLast(state([], null));
    expect(s).toBe(Selection.clear());
  });
});

describe("Selection.wouldEmpty", () => {
  it("true when size=1 and has element", () => {
    expect(Selection.wouldEmpty(state(["a"]), "a")).toBe(true);
  });

  it("false when size=1 but different element", () => {
    expect(Selection.wouldEmpty(state(["a"]), "b")).toBe(false);
  });

  it("false when size > 1", () => {
    expect(Selection.wouldEmpty(state(["a", "b"]), "a")).toBe(false);
  });

  it("false when empty", () => {
    expect(Selection.wouldEmpty(state([]), "a")).toBe(false);
  });
});
