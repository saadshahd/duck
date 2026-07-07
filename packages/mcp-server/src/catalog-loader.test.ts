import { describe, it, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { Effect } from "effect";
import { loadCatalogConfig } from "./catalog-loader.js";

const validCatalogSource =
  "export const config = { components: { Text: { fields: { text: { type: 'text' } }, render: () => null } } };\n";

const invalidCatalogSource = "export const notConfig = 42;\n";

const setup = async () => {
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "jre-catalog-loader-test-"),
  );
  const teardown = () => fs.rm(tmpDir, { recursive: true, force: true });
  return { tmpDir, teardown };
};

describe("loadCatalogConfig", () => {
  it("loads puck.config.ts when present", async () => {
    const { tmpDir, teardown } = await setup();
    try {
      await fs.writeFile(
        path.join(tmpDir, "puck.config.ts"),
        validCatalogSource,
      );
      const config = await Effect.runPromise(loadCatalogConfig(tmpDir));
      expect(Object.keys(config.components)).toEqual(["Text"]);
    } finally {
      await teardown();
    }
  });

  it("falls back to catalog.ts when puck.config.ts is absent", async () => {
    const { tmpDir, teardown } = await setup();
    try {
      await fs.writeFile(path.join(tmpDir, "catalog.ts"), validCatalogSource);
      const config = await Effect.runPromise(loadCatalogConfig(tmpDir));
      expect(Object.keys(config.components)).toEqual(["Text"]);
    } finally {
      await teardown();
    }
  });

  it("prefers puck.config.ts over catalog.ts when both exist", async () => {
    const { tmpDir, teardown } = await setup();
    try {
      await fs.writeFile(
        path.join(tmpDir, "puck.config.ts"),
        validCatalogSource,
      );
      await fs.writeFile(
        path.join(tmpDir, "catalog.ts"),
        "export const config = { components: { Box: { fields: {}, render: () => null } } };\n",
      );
      const config = await Effect.runPromise(loadCatalogConfig(tmpDir));
      expect(Object.keys(config.components)).toEqual(["Text"]);
    } finally {
      await teardown();
    }
  });

  it("fails with CatalogLoadError naming both paths when neither exists", async () => {
    const { tmpDir, teardown } = await setup();
    try {
      const error = await Effect.runPromise(
        Effect.flip(loadCatalogConfig(tmpDir)),
      );
      expect(error._tag).toBe("CatalogLoadError");
      expect(error.path).toContain("puck.config.ts");
      expect(error.path).toContain("catalog.ts");
    } finally {
      await teardown();
    }
  });

  it("fails with CatalogLoadError when catalog.ts exists but exports no valid config", async () => {
    const { tmpDir, teardown } = await setup();
    try {
      await fs.writeFile(path.join(tmpDir, "catalog.ts"), invalidCatalogSource);
      const error = await Effect.runPromise(
        Effect.flip(loadCatalogConfig(tmpDir)),
      );
      expect(error._tag).toBe("CatalogLoadError");
    } finally {
      await teardown();
    }
  });
});
