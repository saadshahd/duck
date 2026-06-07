import { describe, it, expect } from "bun:test";
import type { Field } from "@puckeditor/core";
import { FieldMetadata } from "./field-metadata.js";

// --- Factories ---

const textField = (metadata?: Record<string, unknown>): Field =>
  ({ type: "text", ...(metadata ? { metadata } : {}) }) as Field;

// --- control accessor ---

describe("FieldMetadata.control", () => {
  it("returns the control string when metadata.control is set", () => {
    const field = textField({ control: "segmented" });
    expect(FieldMetadata.control(field)).toBe("segmented");
  });

  it("returns undefined when metadata is absent", () => {
    const field = textField();
    expect(FieldMetadata.control(field)).toBeUndefined();
  });

  it("returns undefined when metadata has no control key", () => {
    const field = textField({ unit: "rem" });
    expect(FieldMetadata.control(field)).toBeUndefined();
  });

  it("returns undefined when metadata.control is not a string (non-string value)", () => {
    const field = textField({ control: 42 });
    expect(FieldMetadata.control(field)).toBeUndefined();
  });
});

// --- unit accessor ---

describe("FieldMetadata.unit", () => {
  it("returns the unit string when metadata.unit is set", () => {
    const field = textField({ unit: "rem" });
    expect(FieldMetadata.unit(field)).toBe("rem");
  });

  it("returns undefined when metadata is absent", () => {
    const field = textField();
    expect(FieldMetadata.unit(field)).toBeUndefined();
  });

  it("returns undefined when metadata.unit is absent", () => {
    const field = textField({ control: "dimension" });
    expect(FieldMetadata.unit(field)).toBeUndefined();
  });

  it("returns undefined when metadata.unit is not a string", () => {
    const field = textField({ unit: true });
    expect(FieldMetadata.unit(field)).toBeUndefined();
  });
});

// --- group accessor ---

describe("FieldMetadata.group", () => {
  it("returns the group string when metadata.group is set", () => {
    const field = textField({ group: "Typography" });
    expect(FieldMetadata.group(field)).toBe("Typography");
  });

  it("returns undefined when metadata is absent", () => {
    const field = textField();
    expect(FieldMetadata.group(field)).toBeUndefined();
  });

  it("returns undefined when metadata.group is absent", () => {
    const field = textField({ control: "segmented" });
    expect(FieldMetadata.group(field)).toBeUndefined();
  });

  it("returns undefined when metadata.group is not a string", () => {
    const field = textField({ group: 0 });
    expect(FieldMetadata.group(field)).toBeUndefined();
  });
});
