import { describe, test, expect } from "bun:test";
import { isEditable } from "./dom-utils.js";

describe("isEditable", () => {
  test("null returns false", () => {
    expect(isEditable(null)).toBe(false);
  });

  test("plain div returns false", () => {
    expect(isEditable(document.createElement("div"))).toBe(false);
  });

  test("contentEditable div returns true", () => {
    const el = document.createElement("div");
    el.contentEditable = "true";
    expect(isEditable(el)).toBe(true);
  });

  test("input element returns true", () => {
    expect(isEditable(document.createElement("input"))).toBe(true);
  });

  test("textarea element returns true", () => {
    expect(isEditable(document.createElement("textarea"))).toBe(true);
  });

  test("button element returns false", () => {
    expect(isEditable(document.createElement("button"))).toBe(false);
  });
});
