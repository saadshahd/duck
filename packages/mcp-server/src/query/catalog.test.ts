import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { catalog } from "./catalog.js";

describe("catalog", () => {
  it("returns catalog json and prompt", async () => {
    const data = { json: { components: {} }, prompt: "Use these components" };
    const result = await Effect.runPromise(catalog(data));
    expect(result).toEqual({
      catalog: { components: {} },
      prompt: "Use these components",
    });
  });
});
