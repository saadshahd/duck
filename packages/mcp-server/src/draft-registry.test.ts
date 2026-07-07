import { describe, it, expect } from "bun:test";
import { createDraftRegistry } from "./draft-registry.js";

describe("createDraftRegistry", () => {
  it("does not own an unclaimed page", () => {
    const registry = createDraftRegistry();
    expect(registry.owns("landing")).toBe(false);
  });

  it("owns a page after claim", () => {
    const registry = createDraftRegistry();
    registry.claim("landing");
    expect(registry.owns("landing")).toBe(true);
  });

  it("claim is idempotent", () => {
    const registry = createDraftRegistry();
    registry.claim("landing");
    registry.claim("landing");
    expect(registry.owns("landing")).toBe(true);
  });

  it("claim is scoped per page", () => {
    const registry = createDraftRegistry();
    registry.claim("landing");
    expect(registry.owns("about")).toBe(false);
  });

  it("release drops ownership", () => {
    const registry = createDraftRegistry();
    registry.claim("landing");
    registry.release("landing");
    expect(registry.owns("landing")).toBe(false);
  });

  it("release of an unclaimed page is a no-op", () => {
    const registry = createDraftRegistry();
    registry.release("landing");
    expect(registry.owns("landing")).toBe(false);
  });

  it("registries are independent sessions", () => {
    const a = createDraftRegistry();
    const b = createDraftRegistry();
    a.claim("landing");
    expect(b.owns("landing")).toBe(false);
  });
});
