import { describe, test, expect } from "bun:test";
import { nextHighlight, prevHighlight } from "./highlight.js";

describe("nextHighlight", () => {
  test("empty list: always -1", () => {
    expect(nextHighlight(-1, 0)).toBe(-1);
    expect(nextHighlight(0, 0)).toBe(-1);
  });

  test("no highlight yet: lands on the first item", () => {
    expect(nextHighlight(-1, 3)).toBe(0);
  });

  test("advances by one within bounds", () => {
    expect(nextHighlight(0, 3)).toBe(1);
    expect(nextHighlight(1, 3)).toBe(2);
  });

  test("wraps from the last item back to the first", () => {
    expect(nextHighlight(2, 3)).toBe(0);
  });

  test("single-item list: stays on the only item", () => {
    expect(nextHighlight(0, 1)).toBe(0);
    expect(nextHighlight(-1, 1)).toBe(0);
  });
});

describe("prevHighlight", () => {
  test("empty list: always -1", () => {
    expect(prevHighlight(-1, 0)).toBe(-1);
    expect(prevHighlight(0, 0)).toBe(-1);
  });

  test("no highlight yet: lands on the last item", () => {
    expect(prevHighlight(-1, 3)).toBe(2);
  });

  test("recedes by one within bounds", () => {
    expect(prevHighlight(2, 3)).toBe(1);
    expect(prevHighlight(1, 3)).toBe(0);
  });

  test("wraps from the first item back to the last", () => {
    expect(prevHighlight(0, 3)).toBe(2);
  });

  test("single-item list: stays on the only item", () => {
    expect(prevHighlight(0, 1)).toBe(0);
    expect(prevHighlight(-1, 1)).toBe(0);
  });
});
