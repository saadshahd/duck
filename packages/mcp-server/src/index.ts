import { resolve } from "node:path";
import { Effect } from "effect";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createFileStorage } from "./file-storage.js";
import { createCaptureStorage } from "./capture-storage.js";
import { createBridge } from "./bridge/index.js";
import { createDraftRegistry } from "./draft-registry.js";
import { createMcpServer } from "./server.js";
import { loadCatalogConfig } from "./catalog-loader.js";
import type { CatalogLoadError } from "./errors.js";

// ── Args ───────────────────────────────────────────────────────────

const args = Bun.argv.slice(2);
const dirIdx = args.indexOf("--project-dir");
const projectDir = resolve(
  dirIdx >= 0 && args[dirIdx + 1] ? args[dirIdx + 1] : process.cwd(),
);

const loadConfig = loadCatalogConfig(projectDir);

// ── Boot ───────────────────────────────────────────────────────────

const formatCatalogError = (err: CatalogLoadError) =>
  `Failed to load catalog from ${err.path}\n` +
  `${err.reason}\n\n` +
  `Expected: puck.config.ts exporting { config } (a @puckeditor/core Config),\n` +
  `falling back to catalog.ts with the same shape.\n` +
  `Check --project-dir or create puck.config.ts in your project root`;

const boot = Effect.gen(function* () {
  const config = yield* loadConfig;
  const storage = createFileStorage(projectDir);
  const captureStorage = createCaptureStorage(projectDir);
  const bridge = createBridge();
  const { port } = yield* Effect.promise(() => bridge.start());

  const mcp = createMcpServer({
    storage,
    config,
    bridge,
    captureStorage,
    drafts: createDraftRegistry(),
  });
  yield* Effect.promise(() => mcp.connect(new StdioServerTransport()));

  console.error(`[duck] Bridge: http://127.0.0.1:${port}`);
}).pipe(
  Effect.catchTag("CatalogLoadError", (err) =>
    Effect.failSync(() => formatCatalogError(err)),
  ),
);

Effect.runPromise(boot).catch((err) => {
  console.error(typeof err === "string" ? err : (err?.message ?? err));
  process.exit(1);
});
