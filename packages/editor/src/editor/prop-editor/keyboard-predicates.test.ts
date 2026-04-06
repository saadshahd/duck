import { describe, test, expect } from "bun:test";
import { isPrintable } from "./keyboard-predicates.js";

const key = (
  k: string,
  mods: Partial<{
    metaKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    isComposing: boolean;
  }> = {},
) =>
  new KeyboardEvent("keydown", {
    key: k,
    metaKey: mods.metaKey,
    ctrlKey: mods.ctrlKey,
    altKey: mods.altKey,
    // isComposing is read-only on KeyboardEvent, so override via subclass
    ...(mods.isComposing != null ? {} : {}),
  });

// happy-dom KeyboardEvent doesn't support isComposing in constructor
const composingKey = (k: string): KeyboardEvent => {
  const e = new KeyboardEvent("keydown", { key: k });
  Object.defineProperty(e, "isComposing", { value: true });
  return e;
};

describe("isPrintable", () => {
  test("single printable character returns true", () => {
    expect(isPrintable(key("a"))).toBe(true);
    expect(isPrintable(key("1"))).toBe(true);
    expect(isPrintable(key(" "))).toBe(true);
    expect(isPrintable(key("."))).toBe(true);
    expect(isPrintable(key("@"))).toBe(true);
  });

  test("unicode single character returns true", () => {
    expect(isPrintable(key("é"))).toBe(true);
    expect(isPrintable(key("中"))).toBe(true);
  });

  test("multi-character keys return false", () => {
    expect(isPrintable(key("Enter"))).toBe(false);
    expect(isPrintable(key("Shift"))).toBe(false);
    expect(isPrintable(key("ArrowLeft"))).toBe(false);
    expect(isPrintable(key("Backspace"))).toBe(false);
    expect(isPrintable(key("Tab"))).toBe(false);
    expect(isPrintable(key("F1"))).toBe(false);
  });

  test("metaKey suppresses", () => {
    expect(isPrintable(key("a", { metaKey: true }))).toBe(false);
  });

  test("ctrlKey suppresses", () => {
    expect(isPrintable(key("c", { ctrlKey: true }))).toBe(false);
  });

  test("altKey suppresses", () => {
    expect(isPrintable(key("f", { altKey: true }))).toBe(false);
  });

  test("isComposing suppresses", () => {
    expect(isPrintable(composingKey("a"))).toBe(false);
  });
});
