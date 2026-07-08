import { describe, test, expect } from "bun:test";
import { allowedTypes } from "./allowed-types.js";
import type { Config } from "@puckeditor/core";

const config = {
  components: {
    Box: { fields: { children: { type: "slot" } } },
    Heading: { fields: {} },
    Text: { fields: {} },
    Button: { fields: {} },
    Card: {
      fields: {
        header: { type: "slot", allow: ["Heading", "Text"] },
        body: { type: "slot", disallow: ["Button"] },
        footer: {
          type: "slot",
          allow: ["Button", "Heading"],
          disallow: ["Heading"],
        },
        main: { type: "slot" },
        label: { type: "text" },
      },
    },
    Sections: {
      fields: {
        items: {
          type: "array",
          arrayFields: {
            heading: { type: "text" },
            content: { type: "slot", allow: ["Text", "Button"] },
          },
        },
        panel: {
          type: "object",
          objectFields: {
            body: { type: "slot", disallow: ["Button"] },
          },
        },
      },
    },
  },
} as unknown as Config;

const ALL_TYPES = new Set([
  "Box",
  "Heading",
  "Text",
  "Button",
  "Card",
  "Sections",
]);

describe("allowedTypes", () => {
  test("allow only → returns that whitelist", () => {
    const result = allowedTypes(config, "Card", ["header"]);
    expect(result).toEqual(new Set(["Heading", "Text"]));
    expect(result.has("Button")).toBe(false);
  });

  test("disallow only → all types minus disallowed", () => {
    const result = allowedTypes(config, "Card", ["body"]);
    expect(result).toEqual(
      new Set([...ALL_TYPES].filter((t) => t !== "Button")),
    );
    expect(result.has("Button")).toBe(false);
    expect(result.has("Heading")).toBe(true);
  });

  test("both allow and disallow → allow defines set, disallow subtracts", () => {
    const result = allowedTypes(config, "Card", ["footer"]);
    expect(result).toEqual(new Set(["Button"]));
    expect(result.has("Heading")).toBe(false);
  });

  test("bare slot (no allow, no disallow) → all types", () => {
    const result = allowedTypes(config, "Card", ["main"]);
    expect(result).toEqual(ALL_TYPES);
  });

  test("array-item slot → walks arrayFields to read its allow list", () => {
    const result = allowedTypes(config, "Sections", ["items", 2, "content"]);
    expect(result).toEqual(new Set(["Text", "Button"]));
  });

  test("object-nested slot → walks objectFields to read its disallow list", () => {
    const result = allowedTypes(config, "Sections", ["panel", "body"]);
    expect(result).toEqual(
      new Set([...ALL_TYPES].filter((t) => t !== "Button")),
    );
  });

  test("fails open: missing parent type → all types", () => {
    const result = allowedTypes(config, "Unknown", ["children"]);
    expect(result).toEqual(ALL_TYPES);
  });

  test("fails open: missing field → all types", () => {
    const result = allowedTypes(config, "Card", ["nonexistent"]);
    expect(result).toEqual(ALL_TYPES);
  });

  test("fails open: non-slot field → all types", () => {
    const result = allowedTypes(config, "Card", ["label"]);
    expect(result).toEqual(ALL_TYPES);
  });

  test("Box.children bare slot → all types", () => {
    const result = allowedTypes(config, "Box", ["children"]);
    expect(result).toEqual(ALL_TYPES);
  });
});
