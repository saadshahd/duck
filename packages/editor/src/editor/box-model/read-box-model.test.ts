import { describe, test, expect } from "bun:test";
import {
  readBoxModel,
  isZeroEdges,
  hasVisibleSpacing,
  type BoxModelEdges,
} from "./read-box-model.js";

// ── helpers ──────────────────────────────────────────────

const edges = (t: number, r: number, b: number, l: number): BoxModelEdges => ({
  top: t,
  right: r,
  bottom: b,
  left: l,
});

/**
 * Build a mock HTMLElement with controlled computed style + bounding rect.
 * happy-dom gives us DOMRect and getComputedStyle globals, but doesn't
 * compute layout — so we stub the element-level values directly.
 */
function mockElement(opts: {
  margin?: [number, number, number, number];
  padding?: [number, number, number, number];
  border?: [number, number, number, number];
  rect?: { x: number; y: number; width: number; height: number };
  display?: string;
  rowGap?: number;
  columnGap?: number;
}): HTMLElement {
  const [mt, mr, mb, ml] = opts.margin ?? [0, 0, 0, 0];
  const [pt, pr, pb, pl] = opts.padding ?? [0, 0, 0, 0];
  const [bt, br, bb, bl] = opts.border ?? [0, 0, 0, 0];
  const r = opts.rect ?? { x: 100, y: 100, width: 200, height: 100 };

  const styleMap: Record<string, string> = {
    "margin-top": `${mt}px`,
    "margin-right": `${mr}px`,
    "margin-bottom": `${mb}px`,
    "margin-left": `${ml}px`,
    "padding-top": `${pt}px`,
    "padding-right": `${pr}px`,
    "padding-bottom": `${pb}px`,
    "padding-left": `${pl}px`,
    "border-top-width": `${bt}px`,
    "border-right-width": `${br}px`,
    "border-bottom-width": `${bb}px`,
    "border-left-width": `${bl}px`,
    display: opts.display ?? "block",
    "row-gap": opts.rowGap !== undefined ? `${opts.rowGap}px` : "normal",
    "column-gap":
      opts.columnGap !== undefined ? `${opts.columnGap}px` : "normal",
  };

  const cs = {
    getPropertyValue: (prop: string) => styleMap[prop] ?? "",
    get display() {
      return styleMap["display"];
    },
    get rowGap() {
      return styleMap["row-gap"];
    },
    get columnGap() {
      return styleMap["column-gap"];
    },
  } as unknown as CSSStyleDeclaration;

  const el = document.createElement("div");
  el.getBoundingClientRect = () => new DOMRect(r.x, r.y, r.width, r.height);

  // Intercept getComputedStyle for this specific element
  const origGetComputedStyle = globalThis.getComputedStyle;
  globalThis.getComputedStyle = ((target: Element) =>
    target === el
      ? cs
      : origGetComputedStyle(target)) as typeof getComputedStyle;

  return el;
}

// ── isZeroEdges ──────────────────────────────────────────

describe("isZeroEdges", () => {
  test("all zeros → true", () => {
    expect(isZeroEdges(edges(0, 0, 0, 0))).toBe(true);
  });

  test("any non-zero → false", () => {
    expect(isZeroEdges(edges(1, 0, 0, 0))).toBe(false);
    expect(isZeroEdges(edges(0, 0, 0, 0.5))).toBe(false);
  });
});

// ── readBoxModel ─────────────────────────────────────────

describe("readBoxModel", () => {
  test("reads margin/padding/border edges from computed style", () => {
    const el = mockElement({
      margin: [10, 20, 10, 20],
      padding: [8, 16, 8, 16],
      border: [1, 1, 1, 1],
      rect: { x: 100, y: 100, width: 200, height: 100 },
    });

    const bm = readBoxModel(el);
    expect(bm.margin).toEqual(edges(10, 20, 10, 20));
    expect(bm.padding).toEqual(edges(8, 16, 8, 16));
    expect(bm.border).toEqual(edges(1, 1, 1, 1));
  });

  test("borderRect equals getBoundingClientRect", () => {
    const el = mockElement({
      rect: { x: 50, y: 75, width: 300, height: 150 },
    });
    const bm = readBoxModel(el);
    expect(bm.borderRect.x).toBe(50);
    expect(bm.borderRect.y).toBe(75);
    expect(bm.borderRect.width).toBe(300);
    expect(bm.borderRect.height).toBe(150);
  });

  test("marginRect expands borderRect outward by margin", () => {
    const el = mockElement({
      margin: [10, 20, 30, 40],
      rect: { x: 100, y: 100, width: 200, height: 100 },
    });
    const bm = readBoxModel(el);
    expect(bm.marginRect.x).toBe(100 - 40);
    expect(bm.marginRect.y).toBe(100 - 10);
    expect(bm.marginRect.width).toBe(200 + 40 + 20);
    expect(bm.marginRect.height).toBe(100 + 10 + 30);
  });

  test("paddingRect insets borderRect by border widths", () => {
    const el = mockElement({
      border: [2, 4, 2, 4],
      rect: { x: 100, y: 100, width: 200, height: 100 },
    });
    const bm = readBoxModel(el);
    expect(bm.paddingRect.x).toBe(104);
    expect(bm.paddingRect.y).toBe(102);
    expect(bm.paddingRect.width).toBe(200 - 4 - 4);
    expect(bm.paddingRect.height).toBe(100 - 2 - 2);
  });

  test("contentRect insets paddingRect by padding", () => {
    const el = mockElement({
      padding: [8, 16, 8, 16],
      border: [1, 1, 1, 1],
      rect: { x: 100, y: 100, width: 200, height: 100 },
    });
    const bm = readBoxModel(el);
    // paddingRect = (101, 101, 198, 98)
    expect(bm.contentRect.x).toBe(101 + 16);
    expect(bm.contentRect.y).toBe(101 + 8);
    expect(bm.contentRect.width).toBe(198 - 16 - 16);
    expect(bm.contentRect.height).toBe(98 - 8 - 8);
  });

  test("contentRect width/height clamps to 0", () => {
    const el = mockElement({
      padding: [100, 100, 100, 100],
      rect: { x: 0, y: 0, width: 50, height: 50 },
    });
    const bm = readBoxModel(el);
    expect(bm.contentRect.width).toBe(0);
    expect(bm.contentRect.height).toBe(0);
  });

  test("zero edges when no spacing", () => {
    const el = mockElement({
      rect: { x: 0, y: 0, width: 100, height: 50 },
    });
    const bm = readBoxModel(el);
    expect(isZeroEdges(bm.margin)).toBe(true);
    expect(isZeroEdges(bm.padding)).toBe(true);
    expect(isZeroEdges(bm.border)).toBe(true);
    expect(bm.gap).toBeNull();
  });
});

// ── gap detection ────────────────────────────────────────

describe("gap detection", () => {
  test("returns null for non-flex/grid display", () => {
    const el = mockElement({ display: "block", rowGap: 16 });
    expect(readBoxModel(el).gap).toBeNull();
  });

  test("returns gap info for flex with non-zero gap", () => {
    const el = mockElement({ display: "flex", rowGap: 0, columnGap: 16 });
    expect(readBoxModel(el).gap).toEqual({ row: 0, column: 16 });
  });

  test("returns gap info for grid with both gaps", () => {
    const el = mockElement({ display: "grid", rowGap: 8, columnGap: 12 });
    expect(readBoxModel(el).gap).toEqual({ row: 8, column: 12 });
  });

  test("returns null for flex with zero gap", () => {
    const el = mockElement({ display: "flex", rowGap: 0, columnGap: 0 });
    expect(readBoxModel(el).gap).toBeNull();
  });

  test("detects inline-flex", () => {
    const el = mockElement({ display: "inline-flex", columnGap: 10 });
    expect(readBoxModel(el).gap).toEqual({ row: 0, column: 10 });
  });
});

// ── hasVisibleSpacing ────────────────────────────────────

describe("hasVisibleSpacing", () => {
  test("false when everything is zero", () => {
    const el = mockElement({});
    expect(hasVisibleSpacing(readBoxModel(el))).toBe(false);
  });

  test("true with margin only", () => {
    const el = mockElement({ margin: [8, 0, 0, 0] });
    expect(hasVisibleSpacing(readBoxModel(el))).toBe(true);
  });

  test("true with gap only", () => {
    const el = mockElement({ display: "flex", columnGap: 16 });
    expect(hasVisibleSpacing(readBoxModel(el))).toBe(true);
  });
});
