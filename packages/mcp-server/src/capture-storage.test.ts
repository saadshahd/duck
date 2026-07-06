import { describe, it, expect, afterEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Effect } from "effect";
import { createCaptureStorage } from "./capture-storage.js";

const TINY_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const tmpDirs: string[] = [];

const makeProjectDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "duck-capture-storage-"));
  tmpDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(
    tmpDirs
      .splice(0)
      .map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("createCaptureStorage", () => {
  it("writes a decoded PNG under .duck/captures and returns its path", async () => {
    const projectDir = await makeProjectDir();
    const storage = createCaptureStorage(projectDir);

    const { path: filePath } = await Effect.runPromise(
      storage.save("landing", TINY_PNG_DATA_URL),
    );

    expect(
      filePath.startsWith(path.join(projectDir, ".duck", "captures")),
    ).toBe(true);
    expect(filePath.endsWith(".png")).toBe(true);
    const written = await fs.readFile(filePath);
    expect(written.length).toBeGreaterThan(0);
  });

  it("fails on a non-image data URL", async () => {
    const projectDir = await makeProjectDir();
    const storage = createCaptureStorage(projectDir);

    const exit = await Effect.runPromiseExit(
      storage.save("landing", "not-a-data-url"),
    );

    expect(exit._tag).toBe("Failure");
  });
});
