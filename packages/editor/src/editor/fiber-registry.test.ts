import { describe, it, expect } from "bun:test";
import { stripReactKeyPrefix } from "./fiber-registry.js";

describe("stripReactKeyPrefix", () => {
  it("strips .$ prefix from React array keys", () => {
    expect(stripReactKeyPrefix(".$foo")).toBe("foo");
  });

  it("preserves dots in the ID after prefix", () => {
    expect(stripReactKeyPrefix(".$section.header")).toBe("section.header");
  });

  it("returns key unchanged when no .$ prefix", () => {
    expect(stripReactKeyPrefix("foo")).toBe("foo");
  });

  it("returns empty string unchanged", () => {
    expect(stripReactKeyPrefix("")).toBe("");
  });

  it("does not strip a single dot prefix", () => {
    expect(stripReactKeyPrefix(".foo")).toBe(".foo");
  });

  it("does not strip a single $ prefix", () => {
    expect(stripReactKeyPrefix("$foo")).toBe("$foo");
  });
});
