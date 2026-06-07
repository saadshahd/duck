import { describe, it, expect } from "bun:test";
import type { Field } from "@puckeditor/core";
import { binOf, grouped } from "./grouping.js";

const f = (type: string) => ({ type }) as Field;

describe("binOf", () => {
  it("slot → slot", () => expect(binOf(f("slot"))).toBe("slot"));
  it("object → disclosed", () => expect(binOf(f("object"))).toBe("disclosed"));
  it("array → disclosed", () => expect(binOf(f("array"))).toBe("disclosed"));
  it("text → primary", () => expect(binOf(f("text"))).toBe("primary"));
  it("select → primary", () => expect(binOf(f("select"))).toBe("primary"));
});

describe("grouped", () => {
  it("orders primary → disclosed → slot, preserving declaration order within a bin", () => {
    const fields: Record<string, Field> = {
      header: f("slot"),
      title: f("text"),
      style: f("object"),
      level: f("select"),
      items: f("array"),
    };
    expect(grouped(fields).map(([k]) => k)).toEqual([
      "title",
      "level",
      "style",
      "items",
      "header",
    ]);
  });
});
