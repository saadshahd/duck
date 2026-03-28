import { describe, it, expect } from "bun:test";
import { outsetRect } from "./highlight.js";

const rect = (x: number, y: number, w: number, h: number) =>
  ({ top: y, left: x, width: w, height: h }) as unknown as DOMRect;

describe("outsetRect", () => {
  it("expands rect by INSET=-2 / EXPAND=4", () => {
    expect(outsetRect(rect(100, 200, 50, 30))).toEqual({
      top: 198,
      left: 98,
      width: 54,
      height: 34,
    });
  });

  it("handles zero-origin rect", () => {
    expect(outsetRect(rect(0, 0, 10, 10))).toEqual({
      top: -2,
      left: -2,
      width: 14,
      height: 14,
    });
  });
});
