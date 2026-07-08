import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { stubRegistry } from "../fiber/testing.js";
import {
  slotInsertIndex,
  slotRegions,
  type MeasuredRegion,
} from "./slot-regions.js";

// --- Factories ---

const card = (
  id: string,
  slots: Record<string, ComponentData[]>,
): ComponentData => ({
  type: "Card",
  props: { id, ...slots },
});

const text = (id: string): ComponentData => ({
  type: "Text",
  props: { id, text: id },
});

const page = (...content: ComponentData[]): Data => ({
  root: { props: {} },
  content,
});

const xywh = (r: DOMRect) => ({ x: r.x, y: r.y, w: r.width, h: r.height });

const shape = (region: MeasuredRegion) => ({
  slotKey: region.path.join("."),
  rect: xywh(region.rect),
  children: region.children.map((c) => ({
    index: c.index,
    rect: xywh(c.rect),
  })),
});

const PARENT = new DOMRect(0, 0, 200, 300);

// --- Tests ---

describe("slotRegions", () => {
  test("populated slots → measured unions in declaration order, empty slot omitted", () => {
    const data = page(
      card("card", {
        header: [text("h1")],
        body: [text("b1"), text("b2")],
        footer: [],
      }),
    );
    const registry = stubRegistry({
      card: PARENT,
      h1: new DOMRect(10, 10, 180, 40),
      b1: new DOMRect(10, 60, 180, 100),
      b2: new DOMRect(10, 170, 180, 60),
    });

    expect(
      slotRegions({ data, parentId: "card", registry }).map(shape),
    ).toEqual([
      {
        slotKey: "header",
        rect: { x: 10, y: 10, w: 180, h: 40 },
        children: [{ index: 0, rect: { x: 10, y: 10, w: 180, h: 40 } }],
      },
      {
        slotKey: "body",
        rect: { x: 10, y: 60, w: 180, h: 170 },
        children: [
          { index: 0, rect: { x: 10, y: 60, w: 180, h: 100 } },
          { index: 1, rect: { x: 10, y: 170, w: 180, h: 60 } },
        ],
      },
    ]);
  });

  test("union is clamped to the parent rect, child rects stay raw", () => {
    const data = page(card("card", { body: [text("b1")] }));
    const registry = stubRegistry({
      card: PARENT,
      b1: new DOMRect(-20, 250, 100, 100),
    });

    expect(
      slotRegions({ data, parentId: "card", registry }).map(shape),
    ).toEqual([
      {
        slotKey: "body",
        rect: { x: 0, y: 250, w: 80, h: 50 },
        children: [{ index: 0, rect: { x: -20, y: 250, w: 100, h: 100 } }],
      },
    ]);
  });

  test("escaped children are dropped, sibling indices preserved", () => {
    const data = page(card("card", { body: [text("esc"), text("b1")] }));
    const registry = stubRegistry({
      card: PARENT,
      esc: new DOMRect(500, 0, 50, 50),
      b1: new DOMRect(10, 60, 180, 100),
    });

    expect(
      slotRegions({ data, parentId: "card", registry }).map(shape),
    ).toEqual([
      {
        slotKey: "body",
        rect: { x: 10, y: 60, w: 180, h: 100 },
        children: [{ index: 1, rect: { x: 10, y: 60, w: 180, h: 100 } }],
      },
    ]);
  });

  test("slot whose children all escaped → omitted", () => {
    const data = page(card("card", { body: [text("esc")] }));
    const registry = stubRegistry({
      card: PARENT,
      esc: new DOMRect(500, 0, 50, 50),
    });

    expect(slotRegions({ data, parentId: "card", registry })).toEqual([]);
  });

  test("zero-size children are excluded; slot with only zero-size children omitted", () => {
    const data = page(
      card("card", {
        header: [text("flat"), text("h1")],
        body: [text("collapsed")],
      }),
    );
    const registry = stubRegistry({
      card: PARENT,
      flat: new DOMRect(10, 10, 180, 0),
      h1: new DOMRect(10, 10, 180, 40),
      collapsed: new DOMRect(10, 60, 0, 0),
    });

    expect(
      slotRegions({ data, parentId: "card", registry }).map(shape),
    ).toEqual([
      {
        slotKey: "header",
        rect: { x: 10, y: 10, w: 180, h: 40 },
        children: [{ index: 1, rect: { x: 10, y: 10, w: 180, h: 40 } }],
      },
    ]);
  });

  test("unregistered children are excluded; slot with no registered children omitted", () => {
    const data = page(
      card("card", {
        header: [text("ghost"), text("h1")],
        body: [text("missing")],
      }),
    );
    const registry = stubRegistry({
      card: PARENT,
      h1: new DOMRect(10, 10, 180, 40),
    });

    expect(
      slotRegions({ data, parentId: "card", registry }).map(shape),
    ).toEqual([
      {
        slotKey: "header",
        rect: { x: 10, y: 10, w: 180, h: 40 },
        children: [{ index: 1, rect: { x: 10, y: 10, w: 180, h: 40 } }],
      },
    ]);
  });

  test("unmeasurable parent → no regions", () => {
    const data = page(card("card", { header: [text("h1")], footer: [] }));
    const registry = stubRegistry({ h1: new DOMRect(10, 10, 180, 40) });

    expect(slotRegions({ data, parentId: "card", registry })).toEqual([]);
  });

  test("unknown parentId → no regions", () => {
    const data = page(card("card", { body: [text("b1")] }));
    const registry = stubRegistry({ card: PARENT });

    expect(slotRegions({ data, parentId: "nope", registry })).toEqual([]);
  });

  test("component without slots → no regions", () => {
    const data = page(text("a"));
    const registry = stubRegistry({ a: PARENT });

    expect(slotRegions({ data, parentId: "a", registry })).toEqual([]);
  });
});

// --- slotInsertIndex ---

const measured = (
  slotKey: string,
  rect: DOMRect,
  children?: DOMRect[],
): MeasuredRegion => ({
  path: [slotKey],
  rect,
  children: (children ?? [rect]).map((r, index) => ({ index, rect: r })),
});

describe("slotInsertIndex", () => {
  // vertical: c0 (10,10,100,40) center y=30, c1 (10,60,100,40) center y=80
  const vertical = measured("body", new DOMRect(10, 10, 100, 90), [
    new DOMRect(10, 10, 100, 40),
    new DOMRect(10, 60, 100, 40),
  ]);

  test("vertical: above the first child's center → its index", () => {
    expect(
      slotInsertIndex({
        point: { x: 50, y: 20 },
        axis: "vertical",
        region: vertical,
      }),
    ).toBe(0);
  });

  test("vertical: below a child's center → its index + 1", () => {
    expect(
      slotInsertIndex({
        point: { x: 50, y: 35 },
        axis: "vertical",
        region: vertical,
      }),
    ).toBe(1);
  });

  test("vertical: below the last child's center → end of slot", () => {
    expect(
      slotInsertIndex({
        point: { x: 50, y: 95 },
        axis: "vertical",
        region: vertical,
      }),
    ).toBe(2);
  });

  test("gap between children: nearest child decides", () => {
    expect(
      slotInsertIndex({
        point: { x: 50, y: 52 },
        axis: "vertical",
        region: vertical,
      }),
    ).toBe(1);
  });

  test("horizontal: before/after the nearest child's center", () => {
    // c0 (10,10,40,100) center x=30, c1 (60,10,40,100) center x=80
    const horizontal = measured("row", new DOMRect(10, 10, 90, 100), [
      new DOMRect(10, 10, 40, 100),
      new DOMRect(60, 10, 40, 100),
    ]);
    expect(
      slotInsertIndex({
        point: { x: 20, y: 50 },
        axis: "horizontal",
        region: horizontal,
      }),
    ).toBe(0);
    expect(
      slotInsertIndex({
        point: { x: 90, y: 50 },
        axis: "horizontal",
        region: horizontal,
      }),
    ).toBe(2);
  });

  test("sparse child indices (escaped sibling dropped) are preserved", () => {
    const region: MeasuredRegion = {
      path: ["body"],
      rect: new DOMRect(10, 60, 100, 40),
      children: [{ index: 2, rect: new DOMRect(10, 60, 100, 40) }],
    };
    expect(
      slotInsertIndex({ point: { x: 50, y: 95 }, axis: "vertical", region }),
    ).toBe(3);
    expect(
      slotInsertIndex({ point: { x: 50, y: 65 }, axis: "vertical", region }),
    ).toBe(2);
  });
});
