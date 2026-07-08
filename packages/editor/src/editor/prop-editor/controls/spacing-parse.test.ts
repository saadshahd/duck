import { test, expect } from "bun:test";
import { parseSides, formatSides, isLinked } from "./spacing-parse.js";

test("parseSides — empty and whitespace → all sides empty", () => {
  const empty = { top: "", right: "", bottom: "", left: "" };
  expect(parseSides("")).toEqual(empty);
  expect(parseSides("   ")).toEqual(empty);
});

test("parseSides — one token fills all four sides", () => {
  expect(parseSides("2rem")).toEqual({
    top: "2rem",
    right: "2rem",
    bottom: "2rem",
    left: "2rem",
  });
});

test("parseSides — two tokens map vertical/horizontal", () => {
  expect(parseSides("1rem 0")).toEqual({
    top: "1rem",
    right: "0",
    bottom: "1rem",
    left: "0",
  });
  expect(parseSides("0 auto")).toEqual({
    top: "0",
    right: "auto",
    bottom: "0",
    left: "auto",
  });
});

test("parseSides — three tokens map top/horizontal/bottom", () => {
  expect(parseSides("1px 2px 3px")).toEqual({
    top: "1px",
    right: "2px",
    bottom: "3px",
    left: "2px",
  });
});

test("parseSides — four tokens map clockwise from top", () => {
  expect(parseSides("8px 12px 8px 16px")).toEqual({
    top: "8px",
    right: "12px",
    bottom: "8px",
    left: "16px",
  });
});

test("parseSides — collapses extra whitespace between tokens", () => {
  expect(parseSides("  1rem   0  ")).toEqual({
    top: "1rem",
    right: "0",
    bottom: "1rem",
    left: "0",
  });
});

test("isLinked — all-equal and all-empty are linked; differing is not", () => {
  expect(isLinked(parseSides("2rem"))).toBe(true);
  expect(isLinked(parseSides(""))).toBe(true);
  expect(isLinked(parseSides("1rem 0"))).toBe(false);
  expect(isLinked(parseSides("0 auto"))).toBe(false);
});

test("formatSides — all-empty → unset", () => {
  expect(formatSides({ top: "", right: "", bottom: "", left: "" })).toBe("");
});

test("formatSides — all-equal collapses to one token", () => {
  expect(
    formatSides({ top: "2rem", right: "2rem", bottom: "2rem", left: "2rem" }),
  ).toBe("2rem");
});

test("formatSides — vertical/horizontal pair collapses to two tokens", () => {
  expect(
    formatSides({ top: "1rem", right: "0", bottom: "1rem", left: "0" }),
  ).toBe("1rem 0");
  expect(
    formatSides({ top: "0", right: "auto", bottom: "0", left: "auto" }),
  ).toBe("0 auto");
});

test("formatSides — top/horizontal/bottom collapses to three tokens", () => {
  expect(
    formatSides({ top: "1px", right: "2px", bottom: "3px", left: "2px" }),
  ).toBe("1px 2px 3px");
});

test("formatSides — four distinct sides stay four tokens", () => {
  expect(
    formatSides({ top: "8px", right: "12px", bottom: "8px", left: "16px" }),
  ).toBe("8px 12px 8px 16px");
});

test("formatSides — an emptied side defaults to 0 (valid shorthand)", () => {
  expect(
    formatSides({ top: "1rem", right: "", bottom: "1rem", left: "" }),
  ).toBe("1rem 0");
});

test("round-trip — parse then format collapses a redundant 4-token value", () => {
  expect(formatSides(parseSides("8px 8px 8px 8px"))).toBe("8px");
  expect(formatSides(parseSides("0 auto 0 auto"))).toBe("0 auto");
});
