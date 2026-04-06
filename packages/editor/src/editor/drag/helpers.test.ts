import { describe, test, expect } from "bun:test";
import { isInContainerZone, resolveInsertIndex } from "./helpers.js";

// 200×200 rect at (100,100). Threshold is 0.2, so inner zone x ∈ (140, 260), y ∈ (140, 260).
const rect = () => new DOMRect(100, 100, 200, 200);

describe("isInContainerZone", () => {
  test("center of rect → true", () => {
    expect(isInContainerZone({ clientX: 200, clientY: 200 }, rect())).toBe(
      true,
    );
  });

  test("just inside inner boundary → true", () => {
    expect(isInContainerZone({ clientX: 141, clientY: 141 }, rect())).toBe(
      true,
    );
    expect(isInContainerZone({ clientX: 259, clientY: 259 }, rect())).toBe(
      true,
    );
  });

  test("exactly at 20% threshold → false (strict >)", () => {
    expect(isInContainerZone({ clientX: 140, clientY: 200 }, rect())).toBe(
      false,
    );
    expect(isInContainerZone({ clientX: 200, clientY: 140 }, rect())).toBe(
      false,
    );
  });

  test("exactly at 80% threshold → false (strict <)", () => {
    expect(isInContainerZone({ clientX: 260, clientY: 200 }, rect())).toBe(
      false,
    );
    expect(isInContainerZone({ clientX: 200, clientY: 260 }, rect())).toBe(
      false,
    );
  });

  test("corners → false", () => {
    expect(isInContainerZone({ clientX: 100, clientY: 100 }, rect())).toBe(
      false,
    );
    expect(isInContainerZone({ clientX: 300, clientY: 300 }, rect())).toBe(
      false,
    );
  });

  test("x in zone but y outside → false", () => {
    expect(isInContainerZone({ clientX: 200, clientY: 100 }, rect())).toBe(
      false,
    );
  });

  test("y in zone but x outside → false", () => {
    expect(isInContainerZone({ clientX: 100, clientY: 200 }, rect())).toBe(
      false,
    );
  });
});

describe("resolveInsertIndex", () => {
  test("bottom → targetIndex + 1", () => {
    expect(resolveInsertIndex(2, "bottom")).toBe(3);
  });

  test("right → targetIndex + 1", () => {
    expect(resolveInsertIndex(0, "right")).toBe(1);
  });

  test("top → targetIndex", () => {
    expect(resolveInsertIndex(2, "top")).toBe(2);
  });

  test("left → targetIndex", () => {
    expect(resolveInsertIndex(3, "left")).toBe(3);
  });

  test("null → targetIndex", () => {
    expect(resolveInsertIndex(1, null)).toBe(1);
  });

  test("targetIndex 0 with bottom → 1", () => {
    expect(resolveInsertIndex(0, "bottom")).toBe(1);
  });

  test("targetIndex 0 with top → 0", () => {
    expect(resolveInsertIndex(0, "top")).toBe(0);
  });
});
