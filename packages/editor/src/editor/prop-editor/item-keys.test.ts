import { describe, it, expect } from "bun:test";
import { createKeyStore, keyFor, carry } from "./item-keys.js";

describe("item-keys", () => {
  it("mints a key on first sighting and returns it thereafter", () => {
    const store = createKeyStore();
    const a = { label: "a" };
    const k = keyFor(store, a);
    expect(keyFor(store, a)).toBe(k);
  });

  it("mints distinct keys for distinct objects with equal content", () => {
    const store = createKeyStore();
    expect(keyFor(store, { label: "x" })).not.toBe(
      keyFor(store, { label: "x" }),
    );
  });

  it("keeps keys stable across reorder (same refs, new positions)", () => {
    const store = createKeyStore();
    const a = { v: 1 };
    const b = { v: 2 };
    const keys = { a: keyFor(store, a), b: keyFor(store, b) };
    expect([b, a].map((x) => keyFor(store, x))).toEqual([keys.b, keys.a]);
  });

  it("carries a key onto the object a nested edit spreads", () => {
    const store = createKeyStore();
    const item = { label: "a" };
    const k = keyFor(store, item);
    const edited = { ...item, label: "b" };
    carry(store, edited, item);
    expect(keyFor(store, edited)).toBe(k);
  });

  it("mints for an unseen prev when carrying, then shares that key", () => {
    const store = createKeyStore();
    const item = { label: "a" };
    const edited = { ...item, label: "b" };
    carry(store, edited, item);
    expect(keyFor(store, edited)).toBe(keyFor(store, item));
  });
});
