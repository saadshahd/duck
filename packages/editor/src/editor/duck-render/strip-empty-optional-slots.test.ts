import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import type { DuckMeta } from "@duckeditor/spec";
import { stripEmptyOptionalSlots } from "./strip-empty-optional-slots.js";

const node = (
  type: string,
  id: string,
  extra: Record<string, unknown> = {},
): ComponentData =>
  ({ type, props: { id, ...extra } }) as unknown as ComponentData;

const wrap = (...content: ComponentData[]): Data =>
  ({ root: { props: {} }, content }) as Data;

const heroMeta: DuckMeta = {
  Hero: { slots: { footer: { optional: true } } },
};

describe("stripEmptyOptionalSlots", () => {
  it("returns input identity when meta is undefined", () => {
    const data = wrap(node("Hero", "h1", { figure: [], content: [], footer: [] }));
    expect(stripEmptyOptionalSlots(data, undefined)).toBe(data);
  });

  it("returns input identity when no nodes match meta", () => {
    const data = wrap(node("Box", "b1", { children: [] }));
    expect(stripEmptyOptionalSlots(data, heroMeta)).toBe(data);
  });

  it("strips empty optional slot prop key", () => {
    const data = wrap(
      node("Hero", "h1", { figure: [], content: [], footer: [] }),
    );
    const out = stripEmptyOptionalSlots(data, heroMeta);
    expect(out).not.toBe(data);
    expect(out.content[0].props).not.toHaveProperty("footer");
    expect(out.content[0].props).toHaveProperty("figure");
    expect(out.content[0].props).toHaveProperty("content");
  });

  it("does not strip when optional slot has children", () => {
    const data = wrap(
      node("Hero", "h1", {
        figure: [],
        content: [],
        footer: [node("Button", "b1", { label: "click" })],
      }),
    );
    expect(stripEmptyOptionalSlots(data, heroMeta)).toBe(data);
  });

  it("does not strip required slot even when empty", () => {
    const data = wrap(node("Hero", "h1", { figure: [], content: [], footer: [] }));
    const out = stripEmptyOptionalSlots(data, heroMeta);
    expect(out.content[0].props).toHaveProperty("figure");
    expect(out.content[0].props).toHaveProperty("content");
  });

  it("recurses into nested components", () => {
    const data = wrap(
      node("Box", "b1", {
        children: [node("Hero", "h1", { figure: [], content: [], footer: [] })],
      }),
    );
    const out = stripEmptyOptionalSlots(data, heroMeta);
    const hero = (out.content[0].props.children as ComponentData[])[0];
    expect(hero.props).not.toHaveProperty("footer");
  });

  it("preserves identity of untouched siblings", () => {
    const untouched = node("Box", "b1", { children: [] });
    const data = wrap(
      untouched,
      node("Hero", "h1", { figure: [], content: [], footer: [] }),
    );
    const out = stripEmptyOptionalSlots(data, heroMeta);
    expect(out.content[0]).toBe(untouched);
  });

  it("strips multiple optional slots on one component", () => {
    const meta: DuckMeta = {
      Multi: {
        slots: { a: { optional: true }, b: { optional: true } },
      },
    };
    const data = wrap(node("Multi", "m1", { a: [], b: [], c: [] }));
    const out = stripEmptyOptionalSlots(data, meta);
    expect(out.content[0].props).not.toHaveProperty("a");
    expect(out.content[0].props).not.toHaveProperty("b");
    expect(out.content[0].props).toHaveProperty("c");
  });

  it("preserves non-slot props", () => {
    const data = wrap(
      node("Hero", "h1", {
        figure: [],
        content: [],
        footer: [],
        title: "x",
        count: 5,
      }),
    );
    const out = stripEmptyOptionalSlots(data, heroMeta);
    expect(out.content[0].props.title).toBe("x");
    expect(out.content[0].props.count).toBe(5);
    expect(out.content[0].props.id).toBe("h1");
  });

  it("strips inside a Hero whose other slot still has children", () => {
    const data = wrap(
      node("Hero", "h1", {
        figure: [],
        content: [node("Text", "t1", { text: "x" })],
        footer: [],
      }),
    );
    const out = stripEmptyOptionalSlots(data, heroMeta);
    expect(out.content[0].props).not.toHaveProperty("footer");
    expect((out.content[0].props.content as unknown[]).length).toBe(1);
  });
});
