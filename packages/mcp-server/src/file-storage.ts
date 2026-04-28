import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Effect, Option } from "effect";
import type { Data } from "@puckeditor/core";
import { preOrder } from "@json-render-editor/spec";
import type { Storage, PageInfo } from "./storage.js";
import { InvalidPageName, NotFound, StorageError } from "./errors.js";

const PAGE_NAME_RE = /^[a-z]([a-z0-9-]{0,62}[a-z0-9])?$/;

const isEnoent = (err: unknown): boolean =>
  err instanceof Error &&
  "code" in err &&
  (err as NodeJS.ErrnoException).code === "ENOENT";

const storageErr = (message: string, cause?: unknown) =>
  new StorageError({ message, cause });

const validatePageName = (
  name: string,
): Effect.Effect<string, InvalidPageName> =>
  PAGE_NAME_RE.test(name)
    ? Effect.succeed(name)
    : Effect.fail(
        new InvalidPageName({
          name,
          reason: "Must be kebab-case (a-z, 0-9, hyphens), 1–64 chars",
        }),
      );

const dataPath = (pagesDir: string, page: string): string =>
  path.join(pagesDir, page, "data.json");

const draftPath = (pagesDir: string, page: string): string =>
  path.join(pagesDir, page, "data.draft.json");

const readJsonFile = (filePath: string): Effect.Effect<Data, StorageError> =>
  Effect.tryPromise({
    try: () => fs.readFile(filePath, "utf-8"),
    catch: (err) => storageErr(`Failed to read ${filePath}`, err),
  }).pipe(
    Effect.flatMap((text) =>
      Effect.try({
        try: () => JSON.parse(text) as Data,
        catch: (err) => storageErr(`Invalid JSON in ${filePath}`, err),
      }),
    ),
  );

const atomicWrite = (
  filePath: string,
  data: string,
): Effect.Effect<void, StorageError> => {
  const tmpPath = filePath + ".tmp";
  return Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: () => fs.mkdir(path.dirname(filePath), { recursive: true }),
      catch: (err) =>
        storageErr(`Failed to create directory for ${filePath}`, err),
    });
    yield* Effect.tryPromise({
      try: () => fs.writeFile(tmpPath, data, "utf-8"),
      catch: (err) => storageErr(`Failed to write temp file ${tmpPath}`, err),
    });
    yield* Effect.tryPromise({
      try: () => fs.rename(tmpPath, filePath),
      catch: (err) =>
        storageErr(`Failed to rename ${tmpPath} to ${filePath}`, err),
    });
  }).pipe(
    Effect.tapError(() =>
      Effect.promise(() => fs.unlink(tmpPath).catch(() => {})),
    ),
  );
};

const fileExists = (filePath: string): Effect.Effect<boolean, StorageError> =>
  Effect.tryPromise({
    try: () => fs.access(filePath).then(() => true),
    catch: (err) => storageErr(`Failed to check existence of ${filePath}`, err),
  }).pipe(
    Effect.catchTag("StorageError", (err) =>
      isEnoent(err.cause) ? Effect.succeed(false) : Effect.fail(err),
    ),
  );

const componentCount = (data: Data): number => {
  let n = 0;
  for (const _ of preOrder(data)) n++;
  return n;
};

export const createFileStorage = (projectDir: string): Storage => {
  const pagesDir = path.join(projectDir, "pages");

  return {
    listPages(): Effect.Effect<PageInfo[], StorageError> {
      return Effect.gen(function* () {
        const entries = yield* Effect.tryPromise({
          try: () => fs.readdir(pagesDir, { withFileTypes: true }),
          catch: (err) => storageErr(`Failed to list ${pagesDir}`, err),
        }).pipe(
          Effect.catchTag("StorageError", (err) =>
            isEnoent(err.cause) ? Effect.succeed([]) : Effect.fail(err),
          ),
        );

        const dirNames = entries
          .filter((e) => e.isDirectory())
          .map((e) => e.name);

        const options = yield* Effect.forEach(dirNames, (name) =>
          readJsonFile(dataPath(pagesDir, name)).pipe(
            Effect.flatMap((data) =>
              fileExists(draftPath(pagesDir, name)).pipe(
                Effect.map(
                  (hasDraft): PageInfo => ({
                    name,
                    componentCount: componentCount(data),
                    hasDraft,
                  }),
                ),
              ),
            ),
            Effect.option,
          ),
        );

        return options.filter(Option.isSome).map((o) => o.value);
      });
    },

    readData(
      page: string,
    ): Effect.Effect<Data, NotFound | StorageError | InvalidPageName> {
      return validatePageName(page).pipe(
        Effect.flatMap(() =>
          Effect.tryPromise({
            try: () => fs.readFile(dataPath(pagesDir, page), "utf-8"),
            catch: (err): NotFound | StorageError =>
              isEnoent(err)
                ? new NotFound({ entity: "page", key: page })
                : storageErr(`Failed to read data for ${page}`, err),
          }),
        ),
        Effect.flatMap((text) =>
          Effect.try({
            try: () => JSON.parse(text) as Data,
            catch: (err) => storageErr(`Invalid JSON in data for ${page}`, err),
          }),
        ),
      );
    },

    writeData(
      page: string,
      data: Data,
    ): Effect.Effect<void, StorageError | InvalidPageName> {
      return validatePageName(page).pipe(
        Effect.flatMap(() =>
          atomicWrite(dataPath(pagesDir, page), JSON.stringify(data, null, 2)),
        ),
      );
    },

    readDraft(
      page: string,
    ): Effect.Effect<Data | null, StorageError | InvalidPageName> {
      return validatePageName(page).pipe(
        Effect.flatMap(() =>
          readJsonFile(draftPath(pagesDir, page)).pipe(
            Effect.map((data): Data | null => data),
            Effect.catchTag("StorageError", (err) =>
              isEnoent(err.cause) ? Effect.succeed(null) : Effect.fail(err),
            ),
          ),
        ),
      );
    },

    writeDraft(
      page: string,
      data: Data,
    ): Effect.Effect<void, StorageError | InvalidPageName> {
      return validatePageName(page).pipe(
        Effect.flatMap(() =>
          atomicWrite(draftPath(pagesDir, page), JSON.stringify(data, null, 2)),
        ),
      );
    },

    commitDraft(
      page: string,
    ): Effect.Effect<void, NotFound | StorageError | InvalidPageName> {
      return validatePageName(page).pipe(
        Effect.flatMap(() =>
          Effect.tryPromise({
            try: () =>
              fs.rename(draftPath(pagesDir, page), dataPath(pagesDir, page)),
            catch: (err): NotFound | StorageError =>
              isEnoent(err)
                ? new NotFound({ entity: "draft", key: page })
                : storageErr(`Failed to commit draft for ${page}`, err),
          }),
        ),
      );
    },

    discardDraft(
      page: string,
    ): Effect.Effect<void, StorageError | InvalidPageName> {
      return validatePageName(page).pipe(
        Effect.flatMap(() =>
          Effect.tryPromise({
            try: () => fs.unlink(draftPath(pagesDir, page)),
            catch: (err) =>
              storageErr(`Failed to discard draft for ${page}`, err),
          }),
        ),
        Effect.catchTag("StorageError", (err) =>
          isEnoent(err.cause) ? Effect.void : Effect.fail(err),
        ),
      );
    },
  };
};
