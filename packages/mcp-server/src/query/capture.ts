import { Effect } from "effect";
import type { BridgeHandle } from "../protocol.js";
import { QueryError } from "../errors.js";

export const capture = (bridge: BridgeHandle, page: string) => {
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
  });
};
