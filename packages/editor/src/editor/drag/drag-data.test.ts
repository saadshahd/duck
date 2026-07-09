import { describe, test, expect } from "bun:test";
import { resolveInsertIndex } from "./drag-data.js";

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
