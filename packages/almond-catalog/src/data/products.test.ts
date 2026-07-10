import { describe, expect, test } from "bun:test";
import { products, resolveProduct } from "./products";

describe("resolveProduct", () => {
  test("resolves a known id to its product", () => {
    expect(resolveProduct("interest")).toEqual(products.interest);
  });

  test("returns null for a dangling id — total, never throws", () => {
    expect(resolveProduct("does-not-exist")).toBeNull();
  });

  test("does not resolve inherited Object keys", () => {
    expect(resolveProduct("toString")).toBeNull();
    expect(resolveProduct("constructor")).toBeNull();
  });
});
