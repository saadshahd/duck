import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";
import { dispatchManifest } from "./manifest.js";

const testCatalog = defineCatalog(schema, {
  components: {
    Box: {
      description: "Layout container",
      slots: ["default"],
      props: z.object({
        padding: z.enum(["0", "4px", "8px"]).optional(),
      }),
    },
    Text: {
      description: "Paragraph text",
      props: z.object({
        text: z.string(),
      }),
    },
  },
  actions: {},
});

describe("dispatchManifest", () => {
  describe("what=components", () => {
    it("returns component names with descriptions and slot info", async () => {
      const result = await Effect.runPromise(
        dispatchManifest(testCatalog, { what: "components" }),
      );

      expect(result).toEqual({
        components: [
          { name: "Box", description: "Layout container", hasSlots: true },
          { name: "Text", description: "Paragraph text", hasSlots: false },
        ],
        actions: [],
      });
    });
  });

  describe("what=component", () => {
    it("returns single component schema", async () => {
      const result = await Effect.runPromise(
        dispatchManifest(testCatalog, {
          what: "component",
          componentType: "Box",
        }),
      );

      expect(result).toEqual({
        name: "Box",
        description: "Layout container",
        slots: ["default"],
        props: {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          properties: {
            padding: { type: "string", enum: ["0", "4px", "8px"] },
          },
          additionalProperties: false,
        },
      });
    });

    it("returns NotFound for unknown component", async () => {
      const result = await Effect.runPromise(
        Effect.flip(
          dispatchManifest(testCatalog, {
            what: "component",
            componentType: "Nope",
          }),
        ),
      );

      expect(result._tag).toBe("NotFound");
    });

    it("fails when componentType is missing", async () => {
      const result = await Effect.runPromise(
        Effect.flip(dispatchManifest(testCatalog, { what: "component" })),
      );

      expect(result._tag).toBe("QueryError");
    });
  });

  describe("what=prompt", () => {
    it("returns the full catalog prompt", async () => {
      const result = await Effect.runPromise(
        dispatchManifest(testCatalog, { what: "prompt" }),
      );

      expect(result).toHaveProperty("prompt");
      expect(typeof (result as any).prompt).toBe("string");
      expect((result as any).prompt.length).toBeGreaterThan(0);
    });
  });

  it("fails for unknown mode", async () => {
    const result = await Effect.runPromise(
      Effect.flip(dispatchManifest(testCatalog, { what: "unknown" as any })),
    );

    expect(result._tag).toBe("QueryError");
  });
});
