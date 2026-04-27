import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import type { Bridge } from "../bridge/index.js";
import { capture } from "./capture.js";

const makeBridge = (
  hasViewers: boolean,
  captureResult?: { image: string },
): Bridge =>
  ({
    hasViewers: () => hasViewers,
    capture: () =>
      captureResult
        ? Promise.resolve(captureResult)
        : Promise.reject(new Error("timeout")),
  }) as unknown as Bridge;

describe("capture", () => {
  it("returns capture result when browser connected", async () => {
    const bridge = makeBridge(true, { image: "base64data" });
    const result = await Effect.runPromise(capture(bridge, "landing"));
    expect(result).toEqual({ image: "base64data" });
  });

  it("fails when no browser connected", async () => {
    const bridge = makeBridge(false);
    const exit = await Effect.runPromiseExit(capture(bridge, "landing"));
    expect(exit._tag).toBe("Failure");
  });

  it("fails on capture timeout", async () => {
    const bridge = makeBridge(true);
    const exit = await Effect.runPromiseExit(capture(bridge, "landing"));
    expect(exit._tag).toBe("Failure");
  });
});
