import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { stubRegistry } from "../fiber/testing.js";
import {
  resolveSlot,
  slotInsertIndex,
  slotRegions,
  type MeasuredRegion,
  type SlotRegion,
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

const shape = (region: SlotRegion) =>
  region.kind === "measured"
    ? {
        slotKey: region.slotKey,
        kind: region.kind,
        rect: xywh(region.rect),
        children: region.children.map((c) => ({
          index: c.index,
          rect: xywh(c.rect),
        })),
      }
    : region;

const PARENT = new DOMRect(0, 0, 200, 300);

// --- Tests ---

describe("slotRegions", () => {
  test("populated slots → measured unions, empty slot → chip, in declaration order", () => {
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
        kind: "measured",
        rect: { x: 10, y: 10, w: 180, h: 40 },
        children: [{ index: 0, rect: { x: 10, y: 10, w: 180, h: 40 } }],
      },
      {
        slotKey: "body",
        kind: "measured",
        rect: { x: 10, y: 60, w: 180, h: 170 },
        children: [
          { index: 0, rect: { x: 10, y: 60, w: 180, h: 100 } },
          { index: 1, rect: { x: 10, y: 170, w: 180, h: 60 } },
        ],
      },
      { slotKey: "footer", kind: "chip" },
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
        kind: "measured",
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
        kind: "measured",
        rect: { x: 10, y: 60, w: 180, h: 100 },
        children: [{ index: 1, rect: { x: 10, y: 60, w: 180, h: 100 } }],
      },
    ]);
  });

  test("slot whose children all escaped → chip", () => {
    const data = page(card("card", { body: [text("esc")] }));
    const registry = stubRegistry({
      card: PARENT,
      esc: new DOMRect(500, 0, 50, 50),
    });

    expect(
      slotRegions({ data, parentId: "card", registry }).map(shape),
    ).toEqual([{ slotKey: "body", kind: "chip" }]);
  });

  test("zero-size children are excluded; slot with only zero-size children → chip", () => {
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
        kind: "measured",
        rect: { x: 10, y: 10, w: 180, h: 40 },
        children: [{ index: 1, rect: { x: 10, y: 10, w: 180, h: 40 } }],
      },
      { slotKey: "body", kind: "chip" },
    ]);
  });

  test("unregistered children are excluded; slot with no registered children → chip", () => {
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
        kind: "measured",
        rect: { x: 10, y: 10, w: 180, h: 40 },
        children: [{ index: 1, rect: { x: 10, y: 10, w: 180, h: 40 } }],
      },
      { slotKey: "body", kind: "chip" },
    ]);
  });

  test("unmeasurable parent → every slot is a chip", () => {
    const data = page(card("card", { header: [text("h1")], footer: [] }));
    const registry = stubRegistry({ h1: new DOMRect(10, 10, 180, 40) });

    expect(
      slotRegions({ data, parentId: "card", registry }).map(shape),
    ).toEqual([
      { slotKey: "header", kind: "chip" },
      { slotKey: "footer", kind: "chip" },
    ]);
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

// --- resolveSlot ---

const measured = (
  slotKey: string,
  rect: DOMRect,
  children?: DOMRect[],
): MeasuredRegion => ({
  slotKey,
  kind: "measured",
  rect,
  children: (children ?? [rect]).map((r, index) => ({ index, rect: r })),
});

const chip = (slotKey: string): SlotRegion => ({ slotKey, kind: "chip" });

describe("resolveSlot", () => {
  // header (0,0,100,100), gap, body (0,120,100,100)
  const gapped = [
    measured("header", new DOMRect(0, 0, 100, 100)),
    measured("body", new DOMRect(0, 120, 100, 100)),
  ];
  // header (0,0,100,100) touching body (0,100,100,100)
  const adjacent = [
    measured("header", new DOMRect(0, 0, 100, 100)),
    measured("body", new DOMRect(0, 100, 100, 100)),
  ];

  test("no current: point inside a region resolves it", () => {
    expect(resolveSlot({ point: { x: 50, y: 50 }, regions: gapped })).toBe(
      gapped[0],
    );
    expect(resolveSlot({ point: { x: 50, y: 150 }, regions: gapped })).toBe(
      gapped[1],
    );
  });

  test("sticky: just across an adjacent boundary holds current", () => {
    expect(
      resolveSlot({
        point: { x: 50, y: 104 },
        regions: adjacent,
        current: "header",
      }),
    ).toBe(adjacent[0]);
  });

  test("clearly inside the next region switches", () => {
    expect(
      resolveSlot({
        point: { x: 50, y: 112 },
        regions: adjacent,
        current: "header",
      }),
    ).toBe(adjacent[1]);
  });

  test("gap between regions holds current", () => {
    expect(
      resolveSlot({
        point: { x: 50, y: 110 },
        regions: gapped,
        current: "header",
      }),
    ).toBe(gapped[0]);
  });

  test("gap with no current resolves the nearest region", () => {
    expect(resolveSlot({ point: { x: 50, y: 105 }, regions: gapped })).toBe(
      gapped[0],
    );
    expect(resolveSlot({ point: { x: 50, y: 118 }, regions: gapped })).toBe(
      gapped[1],
    );
  });

  test("point outside all regions resolves the nearest region", () => {
    expect(resolveSlot({ point: { x: 50, y: 400 }, regions: gapped })).toBe(
      gapped[1],
    );
  });

  test("overlapping regions: nearest individual child rect wins", () => {
    const overlapping = [
      measured("header", new DOMRect(0, 0, 100, 100), [
        new DOMRect(0, 0, 100, 40),
      ]),
      measured("body", new DOMRect(0, 50, 100, 150), [
        new DOMRect(0, 90, 100, 20),
      ]),
    ];
    expect(resolveSlot({ point: { x: 50, y: 80 }, regions: overlapping })).toBe(
      overlapping[1],
    );
    expect(resolveSlot({ point: { x: 50, y: 55 }, regions: overlapping })).toBe(
      overlapping[0],
    );
  });

  test("overlap: current wins over a nearer child in another region", () => {
    const overlapping = [
      measured("header", new DOMRect(0, 0, 100, 100), [
        new DOMRect(0, 0, 100, 40),
      ]),
      measured("body", new DOMRect(0, 50, 100, 150), [
        new DOMRect(0, 90, 100, 20),
      ]),
    ];
    expect(
      resolveSlot({
        point: { x: 50, y: 80 },
        regions: overlapping,
        current: "header",
      }),
    ).toBe(overlapping[0]);
  });

  test("current naming a chip slot is ignored", () => {
    const body = measured("body", new DOMRect(0, 120, 100, 100));
    expect(
      resolveSlot({
        point: { x: 50, y: 150 },
        regions: [chip("header"), body],
        current: "header",
      }),
    ).toBe(body);
  });

  test("chips never resolve", () => {
    expect(
      resolveSlot({
        point: { x: 50, y: 50 },
        regions: [chip("header"), chip("body")],
      }),
    ).toBeUndefined();
  });

  test("no regions → undefined", () => {
    expect(
      resolveSlot({ point: { x: 50, y: 50 }, regions: [] }),
    ).toBeUndefined();
  });
});

// --- slotInsertIndex ---

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
      slotKey: "body",
      kind: "measured",
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
