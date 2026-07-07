import { describe, it, expect } from "bun:test";
import type { Field } from "@puckeditor/core";
import { ArrayItems } from "./array-items.js";

type ArrayField = Extract<Field, { type: "array" }>;

const arrayField = (overrides: Partial<ArrayField> = {}): ArrayField =>
  ({
    type: "array",
    arrayFields: { label: { type: "text" } },
    ...overrides,
  }) as ArrayField;

const items = () => [{ label: "a" }, { label: "b" }, { label: "c" }];

describe("ArrayItems.move", () => {
  it("moves an item forward", () => {
    expect(ArrayItems.move(items(), 0, 1)).toEqual([
      { label: "b" },
      { label: "a" },
      { label: "c" },
    ]);
  });

  it("moves an item backward", () => {
    expect(ArrayItems.move(items(), 2, 1)).toEqual([
      { label: "a" },
      { label: "c" },
      { label: "b" },
    ]);
  });

  it("moves an item to the ends", () => {
    expect(ArrayItems.move(items(), 0, 2)).toEqual([
      { label: "b" },
      { label: "c" },
      { label: "a" },
    ]);
    expect(ArrayItems.move(items(), 2, 0)).toEqual([
      { label: "c" },
      { label: "a" },
      { label: "b" },
    ]);
  });

  it("returns the same reference on no-op or out-of-range", () => {
    const list = items();
    expect(ArrayItems.move(list, 1, 1)).toBe(list);
    expect(ArrayItems.move(list, -1, 0)).toBe(list);
    expect(ArrayItems.move(list, 0, 3)).toBe(list);
    expect(ArrayItems.move(list, 3, 0)).toBe(list);
    expect(ArrayItems.move([], 0, 0)).toEqual([]);
  });

  it("does not mutate the input", () => {
    const list = items();
    ArrayItems.move(list, 0, 2);
    expect(list).toEqual(items());
  });
});

describe("ArrayItems.removeAt", () => {
  it("removes the item at each index", () => {
    expect(ArrayItems.removeAt(items(), 0)).toEqual([
      { label: "b" },
      { label: "c" },
    ]);
    expect(ArrayItems.removeAt(items(), 1)).toEqual([
      { label: "a" },
      { label: "c" },
    ]);
    expect(ArrayItems.removeAt(items(), 2)).toEqual([
      { label: "a" },
      { label: "b" },
    ]);
  });

  it("returns the same reference when out of range", () => {
    const list = items();
    expect(ArrayItems.removeAt(list, -1)).toBe(list);
    expect(ArrayItems.removeAt(list, 3)).toBe(list);
  });

  it("does not mutate the input", () => {
    const list = items();
    ArrayItems.removeAt(list, 1);
    expect(list).toEqual(items());
  });
});

describe("ArrayItems.addGate", () => {
  it("allows when max is undefined", () => {
    expect(ArrayItems.addGate(99)).toEqual({ allowed: true });
  });

  it("allows below max, blocks at and above max with a reason", () => {
    expect(ArrayItems.addGate(2, 3)).toEqual({ allowed: true });
    expect(ArrayItems.addGate(3, 3)).toEqual({
      allowed: false,
      reason: "Maximum 3 items",
    });
    expect(ArrayItems.addGate(4, 3)).toEqual({
      allowed: false,
      reason: "Maximum 3 items",
    });
  });

  it("singularizes the reason at max 1", () => {
    expect(ArrayItems.addGate(1, 1)).toEqual({
      allowed: false,
      reason: "Maximum 1 item",
    });
  });
});

describe("ArrayItems.removeGate", () => {
  it("allows when min is undefined", () => {
    expect(ArrayItems.removeGate(0)).toEqual({ allowed: true });
  });

  it("allows above min, blocks at and below min with a reason", () => {
    expect(ArrayItems.removeGate(2, 1)).toEqual({ allowed: true });
    expect(ArrayItems.removeGate(1, 1)).toEqual({
      allowed: false,
      reason: "Minimum 1 item",
    });
    expect(ArrayItems.removeGate(0, 1)).toEqual({
      allowed: false,
      reason: "Minimum 1 item",
    });
  });

  it("pluralizes the reason above 1", () => {
    expect(ArrayItems.removeGate(2, 2)).toEqual({
      allowed: false,
      reason: "Minimum 2 items",
    });
  });
});

describe("ArrayItems.defaults", () => {
  it("returns an empty object when defaultItemProps is absent", () => {
    expect(ArrayItems.defaults(arrayField(), 0)).toEqual({});
  });

  it("deep-clones an object defaultItemProps", () => {
    const template = { label: "x", nested: { deep: true } };
    const field = arrayField({ defaultItemProps: template });
    const made = ArrayItems.defaults(field, 0) as typeof template;
    expect(made).toEqual(template);
    made.nested.deep = false;
    expect(template.nested.deep).toBe(true);
  });

  it("calls a function defaultItemProps with the index and clones the result", () => {
    const field = arrayField({
      defaultItemProps: (index: number) => ({ label: `item-${index}` }),
    });
    expect(ArrayItems.defaults(field, 4)).toEqual({ label: "item-4" });
  });
});
