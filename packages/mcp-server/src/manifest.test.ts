import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import type { Config } from "@puckeditor/core";
import { dispatchManifest } from "./manifest.js";

const testConfig = {
  components: {
    Box: {
      label: "Layout container",
      defaultProps: { padding: "0" },
      fields: {
        padding: { type: "select", options: [{ label: "0", value: "0" }] },
        children: { type: "slot" },
      },
      render: () => null as never,
    },
    Text: {
      defaultProps: { text: "" },
      fields: { text: { type: "text" } },
      render: () => null as never,
    },
  },
} as unknown as Config;

describe("dispatchManifest", () => {
  describe("what=components", () => {
    it("returns components with fields, defaults, and slot keys", async () => {
      const result = (await Effect.runPromise(
        dispatchManifest(testConfig, { what: "components" }),
      )) as { components: Array<Record<string, unknown>> };

      expect(result.components.map((c) => c.name).sort()).toEqual([
        "Box",
        "Text",
      ]);
      const box = result.components.find((c) => c.name === "Box")!;
      expect(box.label).toBe("Layout container");
      expect(box.defaultProps).toEqual({ padding: "0" });
      expect(box.slots).toEqual(["children"]);
      const text = result.components.find((c) => c.name === "Text")!;
      expect(text.slots).toEqual([]);
    });
  });

  describe("what=component", () => {
    it("returns single component schema", async () => {
      const result = (await Effect.runPromise(
        dispatchManifest(testConfig, {
          what: "component",
          componentType: "Box",
        }),
      )) as Record<string, unknown>;

      expect(result.name).toBe("Box");
      expect(result.label).toBe("Layout container");
      expect(result.defaultProps).toEqual({ padding: "0" });
      expect(result.slots).toEqual(["children"]);
    });

    it("returns NotFound for unknown component", async () => {
      const result = await Effect.runPromise(
        Effect.flip(
          dispatchManifest(testConfig, {
            what: "component",
            componentType: "Nope",
          }),
        ),
      );
      expect(result._tag).toBe("NotFound");
    });

    it("fails when componentType is missing", async () => {
      const result = await Effect.runPromise(
        Effect.flip(dispatchManifest(testConfig, { what: "component" })),
      );
      expect(result._tag).toBe("QueryError");
    });
  });

  describe("what=prompt", () => {
    it("returns the catalog prompt", async () => {
      const result = (await Effect.runPromise(
        dispatchManifest(testConfig, { what: "prompt" }),
      )) as { prompt: string };

      expect(typeof result.prompt).toBe("string");
      expect(result.prompt).toContain("Box");
      expect(result.prompt).toContain("Text");
      expect(result.prompt).toContain("editor_apply");
    });
  });

  it("fails for unknown mode", async () => {
    const result = await Effect.runPromise(
      Effect.flip(dispatchManifest(testConfig, { what: "unknown" as never })),
    );
    expect(result._tag).toBe("QueryError");
  });
});
