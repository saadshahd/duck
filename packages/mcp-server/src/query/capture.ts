import { Effect } from "effect";
import type { Bridge } from "../bridge/index.js";
import type { CaptureStorage } from "../capture-storage.js";
import { QueryError } from "../errors.js";

export const capture = (
  bridge: Bridge,
  captures: CaptureStorage,
  page: string,
) => {
  if (!bridge.hasViewers(page))
    return Effect.fail(
      new QueryError({
        message: `No browser connected for page '${page}'. Open the editor in a browser first.`,
      }),
    );
  return Effect.tryPromise({
    try: () => bridge.capture(page, { mode: "viewport" }),
    catch: (err) =>
      new QueryError({
        message:
          err instanceof Error
            ? `Capture failed: ${err.message}`
            : "Capture timed out or failed",
      }),
  }).pipe(
    Effect.flatMap((result) =>
      captures
        .save(page, result.image)
        .pipe(
          Effect.mapError(
            (err) =>
              new QueryError({
                message: `Failed to save capture: ${err.message}`,
              }),
          ),
        ),
    ),
  );
};
