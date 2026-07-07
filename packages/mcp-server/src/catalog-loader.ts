import { resolve } from "node:path";
import { Effect } from "effect";
import type { Config } from "@puckeditor/core";
import { CatalogLoadError } from "./errors.js";

// Convention: puck.config.ts exporting { config }, falling back to catalog.ts.

const isConfig = (c: unknown): c is Config =>
  !!c && typeof c === "object" && "components" in c;

const tryLoadConfig = (path: string) =>
  Effect.tryPromise({
    try: () => import(path),
    catch: (err): CatalogLoadError =>
      new CatalogLoadError({
        path,
        reason: err instanceof Error ? err.message : String(err),
      }),
  }).pipe(
    Effect.map((mod) => mod.config as Config | undefined),
    Effect.filterOrFail(
      isConfig,
      () =>
        new CatalogLoadError({
          path,
          reason: "Module does not export a valid Puck Config as { config }",
        }),
    ),
  );

/** Load the project's Puck catalog, trying puck.config.ts then falling back
 *  to catalog.ts. Fails with CatalogLoadError naming both paths when neither
 *  exports a valid Config. */
export const loadCatalogConfig = (
  projectDir: string,
): Effect.Effect<Config, CatalogLoadError> => {
  const puckConfigPath = resolve(projectDir, "puck.config.ts");
  const catalogPath = resolve(projectDir, "catalog.ts");

  return tryLoadConfig(puckConfigPath).pipe(
    Effect.catchTag("CatalogLoadError", () =>
      tryLoadConfig(catalogPath).pipe(
        Effect.catchTag("CatalogLoadError", () =>
          Effect.fail(
            new CatalogLoadError({
              path: `${puckConfigPath} or ${catalogPath}`,
              reason: "Neither file exports a valid Puck Config as { config }",
            }),
          ),
        ),
      ),
    ),
  );
};
