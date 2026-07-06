import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Effect } from "effect";
import { StorageError } from "./errors.js";

export type CaptureStorage = {
  /** Decodes a data-URL screenshot to disk, returns the absolute file path. */
  save(
    page: string,
    dataUrl: string,
  ): Effect.Effect<{ path: string }, StorageError>;
};

const DATA_URL_RE = /^data:image\/(png|jpeg);base64,(.+)$/;

const decode = (
  dataUrl: string,
): Effect.Effect<{ ext: string; bytes: Buffer }, StorageError> => {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match)
    return Effect.fail(
      new StorageError({
        message: "Capture image was not a PNG/JPEG data URL",
      }),
    );
  const [, ext, base64] = match;
  return Effect.succeed({ ext, bytes: Buffer.from(base64, "base64") });
};

export const createCaptureStorage = (projectDir: string): CaptureStorage => {
  const capturesDir = path.join(projectDir, ".duck", "captures");

  return {
    save(page, dataUrl) {
      return decode(dataUrl).pipe(
        Effect.flatMap(({ ext, bytes }) =>
          Effect.tryPromise({
            try: () => fs.mkdir(capturesDir, { recursive: true }),
            catch: (err) =>
              new StorageError({
                message: `Failed to create captures dir ${capturesDir}`,
                cause: err,
              }),
          }).pipe(
            Effect.map(
              () =>
                [
                  path.join(
                    capturesDir,
                    `${page}-${crypto.randomUUID()}.${ext}`,
                  ),
                  bytes,
                ] as const,
            ),
          ),
        ),
        Effect.flatMap(([filePath, bytes]) =>
          Effect.tryPromise({
            try: () => fs.writeFile(filePath, bytes),
            catch: (err) =>
              new StorageError({
                message: `Failed to write capture file ${filePath}`,
                cause: err,
              }),
          }).pipe(Effect.map(() => ({ path: filePath }))),
        ),
      );
    },
  };
};
