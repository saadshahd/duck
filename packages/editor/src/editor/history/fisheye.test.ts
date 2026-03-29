import { describe, test, expect } from "bun:test";
import { computeDotSize } from "./fisheye";

describe("computeDotSize", () => {
  test("dot at currentIndex gets max size", () => {
    expect(computeDotSize(5, 5)).toBe(12);
  });

  test("dots far away converge toward min size", () => {
    const size = computeDotSize(100, 0);
    expect(size).toBeGreaterThan(5);
    expect(size).toBeLessThan(5.01);
  });

  test("symmetric: distance -N and +N produce the same size", () => {
    expect(computeDotSize(3, 5)).toBe(computeDotSize(7, 5));
    expect(computeDotSize(0, 5)).toBe(computeDotSize(10, 5));
  });

  test("custom opts override defaults", () => {
    const size = computeDotSize(0, 0, { max: 12, min: 4, decay: 0.5 });
    expect(size).toBe(12);

    const sizeAtDistance1 = computeDotSize(1, 0, {
      max: 12,
      min: 4,
      decay: 0.5,
    });
    expect(sizeAtDistance1).toBe(4 + (12 - 4) * 0.5);
  });

  test("distance 0 always returns max regardless of opts", () => {
    expect(computeDotSize(0, 0)).toBe(12);
    expect(computeDotSize(3, 3, { max: 20, min: 1, decay: 0.1 })).toBe(20);
    expect(computeDotSize(99, 99, { max: 100 })).toBe(100);
  });
});
