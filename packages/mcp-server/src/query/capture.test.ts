import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import type { Bridge } from "../bridge/index.js";
import type { CaptureStorage } from "../capture-storage.js";
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

const makeCaptureStorage = (
  path = "/tmp/duck-captures/landing.png",
): CaptureStorage => ({
  save: () => Effect.succeed({ path }),
});

describe("capture", () => {
  it("saves the screenshot and returns its path when browser connected", async () => {
    const bridge = makeBridge(true, { image: "base64data" });
    const captures = makeCaptureStorage("/tmp/duck-captures/landing.png");
    const result = await Effect.runPromise(
      capture(bridge, captures, "landing"),
    );
    expect(result).toEqual({ path: "/tmp/duck-captures/landing.png" });
  });

  it("fails when no browser connected", async () => {
    const bridge = makeBridge(false);
    const exit = await Effect.runPromiseExit(
      capture(bridge, makeCaptureStorage(), "landing"),
    );
    expect(exit._tag).toBe("Failure");
  });

  it("fails on capture timeout", async () => {
    const bridge = makeBridge(true);
    const exit = await Effect.runPromiseExit(
      capture(bridge, makeCaptureStorage(), "landing"),
    );
    expect(exit._tag).toBe("Failure");
  });
});
