import { Effect } from "effect";
import type { BridgeHandle } from "../protocol.js";

export const selection = (bridge: BridgeHandle, page: string) => {
  const data = bridge.lastSelection(page);
  return Effect.succeed(
    data
      ? { selection: data }
      : { selection: null, connected: bridge.hasViewers(page) },
  );
};
