import { describe, it, expect } from "bun:test";
import { z } from "zod";
import type { UIElement } from "@json-render/core";
import {
  findEditableProp,
  findSingleEditableProp,
} from "./find-editable-prop.js";

const el = (type: string, props: Record<string, unknown>): UIElement => ({
  type,
  props,
});

const headingSchema = z.object({
  level: z.enum(["h1", "h2", "h3"]).optional(),
  text: z.string(),
  style: z.record(z.unknown()).optional(),
});

const buttonSchema = z.object({
  label: z.string(),
  variant: z.enum(["primary", "secondary"]).optional(),
});

describe("findEditableProp", () => {
  it("matches text prop by rendered text", () => {
    const element = el("Heading", { text: "Hello World", level: "h1" });
    expect(findEditableProp(element, headingSchema, "Hello World")).toEqual({
      propKey: "text",
      value: "Hello World",
    });
  });

  it("matches label prop on button", () => {
    const element = el("Button", { label: "Get started", variant: "primary" });
    expect(findEditableProp(element, buttonSchema, "Get started")).toEqual({
      propKey: "label",
      value: "Get started",
    });
  });

  it("normalizes whitespace for comparison", () => {
    const element = el("Text", { text: "Hello  World" });
    const schema = z.object({ text: z.string() });
    // Rendered text collapses double space
    expect(findEditableProp(element, schema, "Hello World")).toEqual({
      propKey: "text",
      value: "Hello  World",
    });
  });

  it("trims whitespace", () => {
    const element = el("Text", { text: "Hello" });
    const schema = z.object({ text: z.string() });
    expect(findEditableProp(element, schema, "  Hello  ")).toEqual({
      propKey: "text",
      value: "Hello",
    });
  });

  it("returns null when no string props exist", () => {
    const element = el("Box", { style: { padding: "1rem" } });
    const schema = z.object({ style: z.record(z.unknown()).optional() });
    expect(findEditableProp(element, schema, "anything")).toBeNull();
  });

  it("returns null when text doesn't match any string prop", () => {
    const element = el("Heading", { text: "Hello", level: "h1" });
    expect(findEditableProp(element, headingSchema, "Goodbye")).toBeNull();
  });

  it("returns null when ambiguous (multiple string props match same text)", () => {
    const element = el("Custom", { title: "Same", subtitle: "Same" });
    const schema = z.object({ title: z.string(), subtitle: z.string() });
    expect(findEditableProp(element, schema, "Same")).toBeNull();
  });

  it("ignores non-string props even if value looks like a string", () => {
    const element = el("Heading", {
      text: "Hello",
      level: "h1",
      style: { color: "red" },
    });
    // level is an enum, not a string — shouldn't match "h1"
    expect(findEditableProp(element, headingSchema, "h1")).toBeNull();
  });

  it("handles optional string props", () => {
    const schema = z.object({ text: z.string().optional() });
    const element = el("Text", { text: "Optional text" });
    expect(findEditableProp(element, schema, "Optional text")).toEqual({
      propKey: "text",
      value: "Optional text",
    });
  });

  it("skips string props with undefined value", () => {
    const schema = z.object({
      text: z.string(),
      subtitle: z.string().optional(),
    });
    const element = el("Custom", { text: "Hello" });
    expect(findEditableProp(element, schema, "Hello")).toEqual({
      propKey: "text",
      value: "Hello",
    });
  });
});

describe("findSingleEditableProp", () => {
  it("returns the single string prop", () => {
    const element = el("Heading", { text: "Hello", level: "h1" });
    expect(findSingleEditableProp(element, headingSchema)).toEqual({
      propKey: "text",
      value: "Hello",
    });
  });

  it("returns null when no string props exist", () => {
    const element = el("Box", { padding: "1rem" });
    const schema = z.object({ padding: z.number() });
    expect(findSingleEditableProp(element, schema)).toBeNull();
  });

  it("returns null when multiple string props exist", () => {
    const element = el("Custom", { title: "A", subtitle: "B" });
    const schema = z.object({ title: z.string(), subtitle: z.string() });
    expect(findSingleEditableProp(element, schema)).toBeNull();
  });

  it("returns null when string prop value is undefined", () => {
    const schema = z.object({ text: z.string().optional() });
    const element = el("Text", {});
    expect(findSingleEditableProp(element, schema)).toBeNull();
  });
});
