import { resolve } from "node:path";
import { Effect } from "effect";
import type { Catalog } from "@json-render/core";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createFileStorage } from "./file-storage.js";
import { createBridge } from "./bridge/index.js";
import { createMcpServer } from "./server.js";
import { CatalogLoadError } from "./errors.js";

// ── Args ───────────────────────────────────────────────────────────

const args = Bun.argv.slice(2);
const dirIdx = args.indexOf("--project-dir");
const projectDir = resolve(
  dirIdx >= 0 && args[dirIdx + 1] ? args[dirIdx + 1] : process.cwd(),
);

// ── Catalog loader ─────────────────────────────────────────────────

const catalogPath = resolve(projectDir, "catalog.ts");

const loadCatalog = Effect.tryPromise({
  try: () => import(catalogPath),
  catch: (err): CatalogLoadError =>
    new CatalogLoadError({
      path: catalogPath,
      reason: err instanceof Error ? err.message : String(err),
    }),
}).pipe(
  Effect.map((mod) => mod.catalog as Catalog | undefined),
  Effect.filterOrFail(
    (c): c is Catalog => !!c && typeof c.prompt === "function",
    () =>
      new CatalogLoadError({
        path: catalogPath,
        reason: "Module does not export a valid Catalog as { catalog }",
      }),
  ),
);

// ── Boot ───────────────────────────────────────────────────────────

const formatCatalogError = (err: CatalogLoadError) =>
  `Failed to load catalog from ${err.path}\n` +
  `${err.reason}\n\n` +
  `Expected: catalog.ts exporting { catalog } (a @json-render/core Catalog)\n` +
  `Check --project-dir or create catalog.ts in your project root`;

const boot = Effect.gen(function* () {
  const catalog = yield* loadCatalog;
  const storage = createFileStorage(projectDir);
  const bridge = createBridge();
  const { port } = yield* Effect.promise(() => bridge.start());

  const mcp = createMcpServer({ storage, catalog, bridge });
  yield* Effect.promise(() => mcp.connect(new StdioServerTransport()));

  console.error(`[json-render-editor] Bridge: http://127.0.0.1:${port}`);
}).pipe(
  Effect.catchTag("CatalogLoadError", (err) =>
    Effect.failSync(() => formatCatalogError(err)),
  ),
);

Effect.runPromise(boot).catch((err) => {
  console.error(typeof err === "string" ? err : (err?.message ?? err));
  process.exit(1);
});
