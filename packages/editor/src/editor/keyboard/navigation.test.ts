import { describe, test, expect } from "bun:test";
import { arrowToDirection } from "./navigation.js";

describe("arrowToDirection", () => {
  test("Down and Right map to forward", () => {
    expect(arrowToDirection("ArrowDown")).toBe("forward");
    expect(arrowToDirection("ArrowRight")).toBe("forward");
  });

  test("Up and Left map to backward", () => {
    expect(arrowToDirection("ArrowUp")).toBe("backward");
    expect(arrowToDirection("ArrowLeft")).toBe("backward");
  });

  test("non-arrow keys return null", () => {
    expect(arrowToDirection("Enter")).toBeNull();
    expect(arrowToDirection("Space")).toBeNull();
  });
});
