import { describe, it, expect } from "bun:test";
import type { Config } from "@puckeditor/core";
import { shouldForceResolveOnOpen } from "./use-prop-editor.js";

const node = (type: string) => ({ type, props: { id: "x" } });

const config = {
  components: {
    Text: { resolveData: async () => ({}), fields: {}, render: () => null },
    Heading: { fields: {}, render: () => null },
  },
} as unknown as Config;

describe("shouldForceResolveOnOpen", () => {
  it("component with a resolveData resolver → true", () => {
    expect(shouldForceResolveOnOpen(config, node("Text"))).toBe(true);
  });

  it("component without a resolver → false", () => {
    expect(shouldForceResolveOnOpen(config, node("Heading"))).toBe(false);
  });

  it("missing component → false", () => {
    expect(shouldForceResolveOnOpen(config, null)).toBe(false);
  });
});
