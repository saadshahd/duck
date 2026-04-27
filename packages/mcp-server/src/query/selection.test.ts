import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import type { Bridge } from "../bridge/index.js";
import { selection } from "./selection.js";

const makeBridge = (
  sel: ReturnType<Bridge["lastSelection"]>,
  hasViewers: boolean,
): Bridge =>
  ({
    lastSelection: () => sel,
    hasViewers: () => hasViewers,
  }) as unknown as Bridge;

describe("selection", () => {
  it("returns selection data when available", async () => {
    const bridge = makeBridge(
      { elementId: "hero", ancestorIds: ["page"] },
      true,
    );
    const result = await Effect.runPromise(selection(bridge, "landing"));
    expect(result).toEqual({
      selection: { elementId: "hero", ancestorIds: ["page"] },
    });
  });

  it("returns null selection with connected status when no selection", async () => {
    const bridge = makeBridge(null, true);
    const result = await Effect.runPromise(selection(bridge, "landing"));
    expect(result).toEqual({ selection: null, connected: true });
  });

  it("returns null selection with disconnected status", async () => {
    const bridge = makeBridge(null, false);
    const result = await Effect.runPromise(selection(bridge, "landing"));
    expect(result).toEqual({ selection: null, connected: false });
  });
});
