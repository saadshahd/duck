import { describe, it, expect } from "bun:test";
import { tetherEndpoints, SHEET_WIDTH } from "./sheet-geometry.js";

const rect = (o: Partial<DOMRect>): DOMRect =>
  ({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    ...o,
  }) as DOMRect;

describe("tetherEndpoints", () => {
  const viewport = { width: 1440, height: 900 };

  it("element mid-canvas: sheet end at sheet left edge, y at element center", () => {
    const r = rect({ top: 100, left: 100, right: 300, bottom: 200 });
    const e = tetherEndpoints(r, viewport);
    expect(e.x2).toBe(1440 - SHEET_WIDTH);
    expect(e.y2).toBe(150); // clamp(150, 8, 892)
    expect(e.x1).toBe(300); // min(rect.right, viewportWidth - width)
    expect(e.y1).toBe(150);
  });

  it("element under the sheet column: element-end x clamps to sheet left", () => {
    const r = rect({ top: 100, left: 1200, right: 1400, bottom: 200 });
    const e = tetherEndpoints(r, viewport);
    expect(e.x1).toBe(1440 - SHEET_WIDTH);
  });

  it("element fully off the top: hidden", () => {
    const r = rect({ top: -200, left: 100, right: 300, bottom: -50 });
    expect(tetherEndpoints(r, viewport).hidden).toBe(true);
  });

  it("element fully below the viewport: hidden", () => {
    const r = rect({ top: 1000, left: 100, right: 300, bottom: 1100 });
    expect(tetherEndpoints(r, viewport).hidden).toBe(true);
  });

  it("element partly off the top: visible, y clamps to 8", () => {
    const r = rect({ top: -50, left: 100, right: 300, bottom: 40 });
    const e = tetherEndpoints(r, viewport);
    expect(e.hidden).toBe(false);
    expect(e.y2).toBe(8);
  });
});
