import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { chipLayout, chipSpecs } from "./slot-chips.js";
import { text, stubRegistry, emptyRegistry } from "./drag-test-fixtures.js";

const card = (
  id: string,
  slots: Record<string, ComponentData[]>,
): ComponentData => ({
  type: "Card",
  props: { id, ...slots },
});

const page = (...content: ComponentData[]): Data => ({
  root: { props: {} },
  content,
});

describe("chipSpecs", () => {
  test("unmeasurable slots become chips with append indices", () => {
    const data = page(
      card("card", {
        header: [text("h1")],
        body: [text("zero"), text("zero2")],
        footer: [],
      }),
    );
    const registry = stubRegistry({
      card: new DOMRect(0, 0, 200, 300),
      h1: new DOMRect(10, 10, 180, 40),
      zero: new DOMRect(10, 60, 0, 0),
      zero2: new DOMRect(10, 60, 0, 0),
    });

    expect(chipSpecs({ data, containerId: "card", registry })).toEqual([
      { slotKey: "body", index: 2 },
      { slotKey: "footer", index: 0 },
    ]);
  });

  test("all slots measured → no chips", () => {
    const data = page(card("card", { header: [text("h1")] }));
    const registry = stubRegistry({
      card: new DOMRect(0, 0, 200, 300),
      h1: new DOMRect(10, 10, 180, 40),
    });

    expect(chipSpecs({ data, containerId: "card", registry })).toEqual([]);
  });

  test("unknown container → no chips", () => {
    expect(
      chipSpecs({ data: page(), containerId: "gone", registry: emptyRegistry }),
    ).toEqual([]);
  });
});

describe("chipLayout", () => {
  test("chips dock inside the container drop zone, in a row", () => {
    const containerRect = new DOMRect(0, 0, 1000, 1000);
    const laid = chipLayout({
      containerRect,
      specs: [
        { slotKey: "header", index: 0 },
        { slotKey: "footer", index: 0 },
      ],
    });

    expect(laid.map((c) => c.slotKey)).toEqual(["header", "footer"]);
    const [a, b] = laid.map((c) => c.rect);
    expect(a.left).toBeGreaterThan(200);
    expect(a.top).toBeGreaterThan(200);
    expect(a.bottom).toBeLessThan(800);
    expect(b.left).toBeGreaterThan(a.right);
    expect(b.top).toBe(a.top);
  });

  test("layout is deterministic for the same inputs", () => {
    const containerRect = new DOMRect(10, 20, 400, 300);
    const specs = [{ slotKey: "footer", index: 0 }];
    expect(chipLayout({ containerRect, specs })).toEqual(
      chipLayout({ containerRect, specs }),
    );
  });
});
