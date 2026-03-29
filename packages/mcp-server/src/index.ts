import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createFileStorage } from "./file-storage.js";
import { createBridge } from "./bridge/index.js";
import { createMcpServer } from "./server.js";
import type { CatalogData } from "./protocol.js";

// ── Args ───────────────────────────────────────────────────────────

const args = Bun.argv.slice(2);
const dirIdx = args.indexOf("--project-dir");
const projectDir = resolve(
  dirIdx >= 0 && args[dirIdx + 1] ? args[dirIdx + 1] : process.cwd(),
);

// ── Catalog loader ─────────────────────────────────────────────────

const loadCatalog = (dir: string): Effect.Effect<CatalogData, string> =>
  Effect.try({
    try: () => ({
      json: JSON.parse(readFileSync(join(dir, "catalog.json"), "utf-8")),
      prompt: readFileSync(join(dir, "catalog-prompt.txt"), "utf-8"),
    }),
    catch: () =>
      `Failed to load catalog from ${dir}\n` +
      `Expected: catalog.json + catalog-prompt.txt\n` +
      `Generate them first or check --project-dir`,
  });

// ── Boot ───────────────────────────────────────────────────────────

const boot = Effect.gen(function* () {
  const catalog = yield* loadCatalog(projectDir);
  const storage = createFileStorage(projectDir);
  const bridge = createBridge();
  const { port } = yield* Effect.promise(() => bridge.start());

  const mcp = createMcpServer({ storage, catalog, bridge });
  yield* Effect.promise(() => mcp.connect(new StdioServerTransport()));

  console.error(`[json-render-editor] Bridge: http://127.0.0.1:${port}`);
});

Effect.runPromise(boot).catch((err) => {
  console.error(typeof err === "string" ? err : (err?.message ?? err));
  process.exit(1);
});
