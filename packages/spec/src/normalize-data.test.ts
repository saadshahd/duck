import { describe, it, expect } from "bun:test";
import type { Data } from "@puckeditor/core";
import { normalizeData } from "./normalize-data.js";

describe("normalizeData", () => {
  it("fills defaults for undefined input", () => {
    const out = normalizeData(undefined);
    expect(out).toEqual({ content: [], root: { props: {} }, zones: {} });
  });

  it("fills defaults for empty object", () => {
    const out = normalizeData({});
    expect(out).toEqual({ content: [], root: { props: {} }, zones: {} });
  });

  it("preserves provided content", () => {
    const item = {
      type: "Heading",
      props: { id: "h1", title: "hello" },
    } as unknown as Data["content"][number];
    const out = normalizeData({ content: [item] });
    expect(out.content).toEqual([item]);
    expect(out.root).toEqual({ props: {} });
    expect(out.zones).toEqual({});
  });

  it("preserves provided root", () => {
    const root = { props: { title: "page" } };
    const out = normalizeData({ root });
    expect(out.root).toBe(root);
  });

  it("preserves provided zones", () => {
    const zones = { "z-1": [] };
    const out = normalizeData({ zones });
    expect(out.zones).toBe(zones);
  });

  it("round-trips a fully populated Data unchanged in content/root/zones references", () => {
    const data: Data = {
      content: [],
      root: { props: { title: "root" } },
      zones: {},
    };
    const out = normalizeData(data);
    expect(out.content).toBe(data.content);
    expect(out.root).toBe(data.root);
    expect(out.zones).toBe(data.zones);
  });
});
