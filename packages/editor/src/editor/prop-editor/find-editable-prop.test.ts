import { describe, it, expect } from "bun:test";
import type { ComponentData, Field } from "@puckeditor/core";
import { findEditableProp, type ResolvedFields } from "./find-editable-prop.js";

const component = (
  type: string,
  props: Record<string, unknown>,
): ComponentData => ({
  type,
  props: { id: `${type}-1`, ...props },
});

const text: Field = { type: "text" };
const textarea: Field = { type: "textarea" };
const number: Field = { type: "number" };
const select: Field = {
  type: "select",
  options: [{ label: "H1", value: "h1" }],
};

describe("findEditableProp", () => {
  it("uses hint.propKey when field is text and value is non-empty string", () => {
    const fields: ResolvedFields = { text, level: select };
    const data = component("Heading", { text: "Hello World", level: "h1" });
    expect(findEditableProp(data, fields, { propKey: "text" })).toEqual({
      propKey: "text",
      propPath: ["text"],
      value: "Hello World",
      field: text,
    });
  });

  it("uses hint.propKey for textarea field", () => {
    const fields: ResolvedFields = { body: textarea };
    const data = component("Article", { body: "Long form text" });
    expect(findEditableProp(data, fields, { propKey: "body" })).toEqual({
      propKey: "body",
      propPath: ["body"],
      value: "Long form text",
      field: textarea,
    });
  });

  it("falls back to first text/textarea field when hint.propKey is missing", () => {
    const fields: ResolvedFields = { level: select, text };
    const data = component("Heading", { text: "Hello", level: "h1" });
    expect(findEditableProp(data, fields)).toEqual({
      propKey: "text",
      propPath: ["text"],
      value: "Hello",
      field: text,
    });
  });

  it("falls back when hint.propKey targets a non-text field", () => {
    const fields: ResolvedFields = { level: select, text };
    const data = component("Heading", { text: "Hello", level: "h1" });
    expect(findEditableProp(data, fields, { propKey: "level" })).toEqual({
      propKey: "text",
      propPath: ["text"],
      value: "Hello",
      field: text,
    });
  });

  it("falls back when hint.propKey field is text but value isn't a string", () => {
    const fields: ResolvedFields = { count: text, label: text };
    const data = component("Item", { count: 5, label: "Items" });
    expect(findEditableProp(data, fields, { propKey: "count" })).toEqual({
      propKey: "label",
      propPath: ["label"],
      value: "Items",
      field: text,
    });
  });

  it("falls back when hint.propKey value is empty string", () => {
    const fields: ResolvedFields = { title: text, subtitle: text };
    const data = component("Card", { title: "", subtitle: "Sub" });
    expect(findEditableProp(data, fields, { propKey: "title" })).toEqual({
      propKey: "subtitle",
      propPath: ["subtitle"],
      value: "Sub",
      field: text,
    });
  });

  it("returns null when no fields are editable text", () => {
    const fields: ResolvedFields = { count: number, level: select };
    const data = component("Box", { count: 1, level: "h1" });
    expect(findEditableProp(data, fields)).toBeNull();
  });

  it("returns null when text/textarea fields have non-string values", () => {
    const fields: ResolvedFields = { title: text };
    const data = component("Card", { title: 42 });
    expect(findEditableProp(data, fields)).toBeNull();
  });

  it("returns null when text/textarea fields have empty string values", () => {
    const fields: ResolvedFields = { title: text, body: textarea };
    const data = component("Article", { title: "", body: "" });
    expect(findEditableProp(data, fields)).toBeNull();
  });

  it("returns null when fields object is empty", () => {
    const data = component("Box", { padding: "1rem" });
    expect(findEditableProp(data, {})).toBeNull();
  });

  it("preserves field iteration order for fallback", () => {
    const fields: ResolvedFields = { title: text, body: textarea };
    const data = component("Card", { title: "Title", body: "Body" });
    expect(findEditableProp(data, fields)?.propKey).toBe("title");
  });
});
