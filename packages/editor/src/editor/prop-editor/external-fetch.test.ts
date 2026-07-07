import { describe, it, expect } from "bun:test";
import type { Field } from "@puckeditor/core";
import {
  fetchExternal,
  externalMapProp,
  initialQuery,
  initialFilters,
} from "./external-fetch.js";

type ExternalUnion = Extract<Field, { type: "external" }>;

const directField = (
  extra: Partial<ExternalUnion> & {
    fetchList: (p: { query?: string; filters?: unknown }) => Promise<unknown[]>;
  },
): ExternalUnion =>
  ({ type: "external", ...extra }) as unknown as ExternalUnion;

describe("fetchExternal — options wired through, not dropped", () => {
  it("threads the search query and filters into fetchList", async () => {
    let received: unknown;
    const field = directField({
      fetchList: async (params: { query?: string; filters?: unknown }) => {
        received = params;
        return [{ title: "Apple" }];
      },
    });

    const rows = await fetchExternal(field, {
      query: "app",
      filters: { rating: 4 },
    });

    expect(received).toEqual({ query: "app", filters: { rating: 4 } });
    expect(rows).toEqual([{ title: "Apple" }]);
  });

  it("a null fetch result degrades to an empty list", async () => {
    const field = directField({
      fetchList: async () => null as unknown as unknown[],
    });
    expect(await fetchExternal(field, { query: "", filters: {} })).toEqual([]);
  });

  it("adaptor fields fetch by their static adaptorParams", async () => {
    let received: unknown;
    const field = {
      type: "external",
      adaptor: {
        fetchList: async (params: unknown) => {
          received = params;
          return [{ id: 1 }];
        },
      },
      adaptorParams: { resource: "posts" },
    } as unknown as ExternalUnion;

    const rows = await fetchExternal(field, {
      query: "ignored",
      filters: {},
    });

    expect(received).toEqual({ resource: "posts" });
    expect(rows).toEqual([{ id: 1 }]);
  });
});

describe("externalMapProp", () => {
  it("uses mapProp when declared", () => {
    const field = directField({
      fetchList: async () => [],
      mapProp: (item: unknown) => (item as { title: string }).title,
    } as never);
    expect(externalMapProp(field)({ title: "Apple" })).toBe("Apple");
  });

  it("falls back to identity when mapProp is absent", () => {
    const item = { title: "Apple" };
    const field = directField({ fetchList: async () => [] });
    expect(externalMapProp(field)(item)).toBe(item);
  });
});

describe("initial seeds", () => {
  it("seeds the query from initialQuery", () => {
    const field = directField({
      fetchList: async () => [],
      initialQuery: "hello",
    } as never);
    expect(initialQuery(field)).toBe("hello");
  });

  it("seeds filters from initialFilters", () => {
    const field = directField({
      fetchList: async () => [],
      initialFilters: { rating: 1 },
    } as never);
    expect(initialFilters(field)).toEqual({ rating: 1 });
  });

  it("defaults to empty query and filters", () => {
    const field = directField({ fetchList: async () => [] });
    expect(initialQuery(field)).toBe("");
    expect(initialFilters(field)).toEqual({});
  });
});
