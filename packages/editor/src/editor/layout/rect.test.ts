import { describe, test, expect } from "bun:test";
import { expandRect, insetRect, rectsOverlap, isCollapsed } from "./rect.js";

const rect = (x: number, y: number, w: number, h: number) =>
  new DOMRect(x, y, w, h);

const edges = (t: number, r: number, b: number, l: number) => ({
  top: t,
  right: r,
  bottom: b,
  left: l,
});

// ── expandRect ──────────────────────────────────────────

describe("expandRect", () => {
  test("expands outward by edge values", () => {
    const r = expandRect(rect(100, 100, 200, 100), edges(10, 20, 30, 40));
    expect(r.x).toBe(60);
    expect(r.y).toBe(90);
    expect(r.width).toBe(260);
    expect(r.height).toBe(140);
  });

  test("zero edges returns same dimensions", () => {
    const r = expandRect(rect(50, 50, 100, 80), edges(0, 0, 0, 0));
    expect(r.x).toBe(50);
    expect(r.y).toBe(50);
    expect(r.width).toBe(100);
    expect(r.height).toBe(80);
  });
});

// ── insetRect ───────────────────────────────────────────

describe("insetRect", () => {
  test("shrinks inward by edge values", () => {
    const r = insetRect(rect(100, 100, 200, 100), edges(10, 20, 30, 40));
    expect(r.x).toBe(140);
    expect(r.y).toBe(110);
    expect(r.width).toBe(140);
    expect(r.height).toBe(60);
  });

  test("clamps width and height to zero", () => {
    const r = insetRect(rect(0, 0, 50, 50), edges(100, 100, 100, 100));
    expect(r.width).toBe(0);
    expect(r.height).toBe(0);
  });

  test("zero edges returns same dimensions", () => {
    const r = insetRect(rect(10, 20, 300, 150), edges(0, 0, 0, 0));
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
    expect(r.width).toBe(300);
    expect(r.height).toBe(150);
  });
});

// ── rectsOverlap ────────────────────────────────────────

describe("rectsOverlap", () => {
  test("overlapping rects → true", () => {
    expect(rectsOverlap(rect(0, 0, 100, 100), rect(50, 50, 100, 100))).toBe(
      true,
    );
  });

  test("non-overlapping rects → false", () => {
    expect(rectsOverlap(rect(0, 0, 50, 50), rect(100, 100, 50, 50))).toBe(
      false,
    );
  });

  test("edge-touching rects → false (not overlapping)", () => {
    expect(rectsOverlap(rect(0, 0, 100, 100), rect(100, 0, 100, 100))).toBe(
      false,
    );
    expect(rectsOverlap(rect(0, 0, 100, 100), rect(0, 100, 100, 100))).toBe(
      false,
    );
  });

  test("contained rect → true", () => {
    expect(rectsOverlap(rect(0, 0, 200, 200), rect(50, 50, 50, 50))).toBe(true);
  });
});

// ── isCollapsed ─────────────────────────────────────────

describe("isCollapsed", () => {
  test("zero width → true", () => {
    expect(isCollapsed(rect(0, 0, 0, 100))).toBe(true);
  });

  test("zero height → true", () => {
    expect(isCollapsed(rect(0, 0, 100, 0))).toBe(true);
  });

  test("sub-pixel dimensions → true", () => {
    expect(isCollapsed(rect(0, 0, 0.5, 100))).toBe(true);
    expect(isCollapsed(rect(0, 0, 100, 0.5))).toBe(true);
  });

  test("normal rect → false", () => {
    expect(isCollapsed(rect(0, 0, 100, 50))).toBe(false);
  });

  test("custom threshold", () => {
    expect(isCollapsed(rect(0, 0, 5, 5), 10)).toBe(true);
    expect(isCollapsed(rect(0, 0, 15, 15), 10)).toBe(false);
  });
});
