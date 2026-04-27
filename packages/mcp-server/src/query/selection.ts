import { Effect } from "effect";
import type { Bridge } from "../bridge/index.js";

export const selection = (bridge: Bridge, page: string) => {
  const data = bridge.lastSelection(page);
  return Effect.succeed(
    data
      ? { selection: data }
      : { selection: null, connected: bridge.hasViewers(page) },
  );
};
