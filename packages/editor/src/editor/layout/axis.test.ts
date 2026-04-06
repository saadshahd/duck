import { describe, test, expect } from "bun:test";
import { detectAxis } from "./axis.js";

describe("detectAxis", () => {
  test("stacked rects → vertical", () => {
    const a = new DOMRect(0, 0, 100, 50);
    const b = new DOMRect(0, 60, 100, 50);
    expect(detectAxis(a, b)).toBe("vertical");
  });

  test("side-by-side rects → horizontal", () => {
    const a = new DOMRect(0, 0, 50, 100);
    const b = new DOMRect(60, 0, 50, 100);
    expect(detectAxis(a, b)).toBe("horizontal");
  });

  test("equal center distances → horizontal (dy > dx is false)", () => {
    const a = new DOMRect(0, 0, 100, 100);
    const b = new DOMRect(50, 50, 100, 100);
    expect(detectAxis(a, b)).toBe("horizontal");
  });

  test("identical rects → horizontal", () => {
    const r = new DOMRect(10, 10, 80, 40);
    expect(detectAxis(r, r)).toBe("horizontal");
  });

  test("zero-size rects offset horizontally → horizontal", () => {
    expect(detectAxis(new DOMRect(0, 0, 0, 0), new DOMRect(10, 0, 0, 0))).toBe(
      "horizontal",
    );
  });

  test("zero-size rects offset vertically → vertical", () => {
    expect(detectAxis(new DOMRect(0, 0, 0, 0), new DOMRect(0, 10, 0, 0))).toBe(
      "vertical",
    );
  });

  test("slight horizontal offset with dominant vertical gap → vertical", () => {
    const a = new DOMRect(0, 0, 100, 40);
    const b = new DOMRect(5, 80, 100, 40);
    expect(detectAxis(a, b)).toBe("vertical");
  });

  test("slight vertical offset with dominant horizontal gap → horizontal", () => {
    const a = new DOMRect(0, 0, 40, 100);
    const b = new DOMRect(80, 5, 40, 100);
    expect(detectAxis(a, b)).toBe("horizontal");
  });
});
