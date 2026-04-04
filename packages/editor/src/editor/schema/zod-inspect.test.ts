import { describe, it, expect } from "bun:test";
import { z } from "zod";
import {
  unwrap,
  isString,
  isEnum,
  isNumber,
  isBoolean,
  isObject,
  isRecord,
  isArray,
  isOptional,
  enumValues,
  shapeEntries,
} from "./zod-inspect.js";

describe("unwrap", () => {
  it("passes through plain types", () => {
    expect(unwrap(z.string())).toBeInstanceOf(z.ZodString);
  });

  it("unwraps optional", () => {
    expect(unwrap(z.string().optional())).toBeInstanceOf(z.ZodString);
  });

  it("unwraps default", () => {
    expect(unwrap(z.string().default("x"))).toBeInstanceOf(z.ZodString);
  });

  it("unwraps nullable", () => {
    expect(unwrap(z.string().nullable())).toBeInstanceOf(z.ZodString);
  });

  it("unwraps nested wrappers", () => {
    expect(unwrap(z.string().optional().nullable())).toBeInstanceOf(
      z.ZodString,
    );
  });
});

describe("type predicates", () => {
  it("isString", () => {
    expect(isString(z.string())).toBe(true);
    expect(isString(z.string().optional())).toBe(true);
    expect(isString(z.number())).toBe(false);
  });

  it("isEnum", () => {
    expect(isEnum(z.enum(["a", "b"]))).toBe(true);
    expect(isEnum(z.enum(["a"]).optional())).toBe(true);
    expect(isEnum(z.string())).toBe(false);
  });

  it("isNumber", () => {
    expect(isNumber(z.number())).toBe(true);
    expect(isNumber(z.string())).toBe(false);
  });

  it("isBoolean", () => {
    expect(isBoolean(z.boolean())).toBe(true);
    expect(isBoolean(z.boolean().optional())).toBe(true);
    expect(isBoolean(z.string())).toBe(false);
  });

  it("isObject", () => {
    expect(isObject(z.object({ a: z.string() }))).toBe(true);
    expect(isObject(z.string())).toBe(false);
  });

  it("isRecord", () => {
    expect(isRecord(z.record(z.unknown()))).toBe(true);
    expect(isRecord(z.string())).toBe(false);
  });

  it("isArray", () => {
    expect(isArray(z.array(z.string()))).toBe(true);
    expect(isArray(z.string())).toBe(false);
  });
});

describe("isOptional", () => {
  it("true for optional", () =>
    expect(isOptional(z.string().optional())).toBe(true));
  it("true for default", () =>
    expect(isOptional(z.string().default("x"))).toBe(true));
  it("false for required", () => expect(isOptional(z.string())).toBe(false));
  it("false for nullable", () =>
    expect(isOptional(z.string().nullable())).toBe(false));
});

describe("enumValues", () => {
  it("extracts values", () => {
    expect(enumValues(z.enum(["h1", "h2", "h3"]))).toEqual(["h1", "h2", "h3"]);
  });

  it("unwraps optional enum", () => {
    expect(enumValues(z.enum(["a", "b"]).optional())).toEqual(["a", "b"]);
  });
});

describe("shapeEntries", () => {
  it("extracts entries from ZodObject", () => {
    const entries = shapeEntries(
      z.object({ text: z.string(), level: z.enum(["h1"]) }),
    );
    expect(entries.map(([k]) => k)).toEqual(["text", "level"]);
    expect(isString(entries[0][1])).toBe(true);
    expect(isEnum(entries[1][1])).toBe(true);
  });

  it("returns empty for non-object", () => {
    expect(shapeEntries(z.string())).toEqual([]);
  });

  it("unwraps optional object", () => {
    const entries = shapeEntries(z.object({ name: z.string() }).optional());
    expect(entries.map(([k]) => k)).toEqual(["name"]);
  });
});
