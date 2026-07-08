import { test, expect } from "bun:test";
import { radioLayout } from "./radio-layout.js";

const opts = (...labels: string[]) => labels.map((label) => ({ label }));

test("empty option set → stacked (nothing to segment)", () => {
  expect(radioLayout([])).toBe("stacked");
});

test("two short options (a boolean radio) → segmented", () => {
  expect(radioLayout(opts("Yes", "No"))).toBe("segmented");
  expect(radioLayout(opts("Enabled", "Disabled"))).toBe("segmented");
});

test("three short options → segmented", () => {
  expect(radioLayout(opts("Low", "Medium", "High"))).toBe("segmented");
});

test("four options → stacked (count over threshold)", () => {
  expect(radioLayout(opts("One", "Two", "Three", "Four"))).toBe("stacked");
});

test("five options → stacked", () => {
  expect(
    radioLayout(opts("Neutral", "Info", "Positive", "Warning", "Critical")),
  ).toBe("stacked");
});

test("three options but one long label → stacked", () => {
  expect(radioLayout(opts("Low", "Informational", "High"))).toBe("stacked");
});

test("label length boundary: exactly 10 chars stays segmented, 11 stacks", () => {
  expect(radioLayout(opts("0123456789"))).toBe("segmented");
  expect(radioLayout(opts("01234567890"))).toBe("stacked");
});

test("single option → segmented (small and short)", () => {
  expect(radioLayout(opts("Only"))).toBe("segmented");
});
