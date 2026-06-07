import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import {
  detectAxis,
  cssAxis,
  geometricEdge,
  rectAxis,
  resolveSlotAxis,
} from "./axis.js";
import { stubRegistry } from "../fiber/testing.js";

describe("detectAxis", () => {
  test("stacked rects → vertical", () => {
    const a = new DOMRect(0, 0, 100, 50);
    const b = new DOMRect(0, 60, 100, 50);
    expect(detectAxis(a, b)).toBe("vertical");
  });

  test("side-by-side rects → horizontal", () => {
    const a = new DOMRect(0, 0, 50, 100);
    const b = new DOMRect(60, 0, 50, 100);
    expect(detectAxis(a, b)).toBe("horizontal");
  });

  test("equal center distances → horizontal (dy > dx is false)", () => {
    const a = new DOMRect(0, 0, 100, 100);
    const b = new DOMRect(50, 50, 100, 100);
    expect(detectAxis(a, b)).toBe("horizontal");
  });

  test("identical rects → horizontal", () => {
    const r = new DOMRect(10, 10, 80, 40);
    expect(detectAxis(r, r)).toBe("horizontal");
  });

  test("zero-size rects offset horizontally → horizontal", () => {
    expect(detectAxis(new DOMRect(0, 0, 0, 0), new DOMRect(10, 0, 0, 0))).toBe(
      "horizontal",
    );
  });

  test("zero-size rects offset vertically → vertical", () => {
    expect(detectAxis(new DOMRect(0, 0, 0, 0), new DOMRect(0, 10, 0, 0))).toBe(
      "vertical",
    );
  });

  test("slight horizontal offset with dominant vertical gap → vertical", () => {
    const a = new DOMRect(0, 0, 100, 40);
    const b = new DOMRect(5, 80, 100, 40);
    expect(detectAxis(a, b)).toBe("vertical");
  });

  test("slight vertical offset with dominant horizontal gap → horizontal", () => {
    const a = new DOMRect(0, 0, 40, 100);
    const b = new DOMRect(80, 5, 40, 100);
    expect(detectAxis(a, b)).toBe("horizontal");
  });
});

// ── geometricEdge ────────────────────────────────────────────────────────────

describe("geometricEdge", () => {
  // rect: top=100, height=200 → vertical midpoint at y=200
  const vRect = new DOMRect(0, 100, 50, 200);
  // rect: left=200, width=180 → horizontal midpoint at x=290
  const hRect = new DOMRect(200, 0, 180, 90);

  test("vertical axis, point above midpoint → top", () => {
    expect(geometricEdge(vRect, { x: 25, y: 150 }, "vertical")).toBe("top");
  });

  test("vertical axis, point below midpoint → bottom", () => {
    expect(geometricEdge(vRect, { x: 25, y: 250 }, "vertical")).toBe("bottom");
  });

  test("vertical axis, point exactly at midpoint → bottom (not strictly less)", () => {
    expect(geometricEdge(vRect, { x: 25, y: 200 }, "vertical")).toBe("bottom");
  });

  test("horizontal axis, point left of midpoint → left", () => {
    expect(geometricEdge(hRect, { x: 270, y: 40 }, "horizontal")).toBe("left");
  });

  test("horizontal axis, point right of midpoint → right", () => {
    expect(geometricEdge(hRect, { x: 310, y: 40 }, "horizontal")).toBe("right");
  });

  test("horizontal axis, point exactly at midpoint → right (not strictly less)", () => {
    expect(geometricEdge(hRect, { x: 290, y: 40 }, "horizontal")).toBe("right");
  });
});

// ── cssAxis ──────────────────────────────────────────────────────────────────

describe("cssAxis", () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement("div");
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  const setStyle = (el: HTMLElement, css: string) =>
    el.setAttribute("style", css);

  // flex

  test("display:flex with no flex-direction → horizontal (CSS default is row)", () => {
    setStyle(el, "display: flex;");
    expect(cssAxis(el)).toBe("horizontal");
  });

  test("display:flex flex-direction:row → horizontal", () => {
    setStyle(el, "display: flex; flex-direction: row;");
    expect(cssAxis(el)).toBe("horizontal");
  });

  test("display:flex flex-direction:column → vertical", () => {
    setStyle(el, "display: flex; flex-direction: column;");
    expect(cssAxis(el)).toBe("vertical");
  });

  test("display:flex flex-direction:column-reverse → vertical (prefix match)", () => {
    setStyle(el, "display: flex; flex-direction: column-reverse;");
    expect(cssAxis(el)).toBe("vertical");
  });

  // inline-flex

  test("display:inline-flex flex-direction:column → vertical", () => {
    setStyle(el, "display: inline-flex; flex-direction: column;");
    expect(cssAxis(el)).toBe("vertical");
  });

  // grid

  test("display:grid default (no grid-auto-flow) → vertical", () => {
    setStyle(el, "display: grid;");
    expect(cssAxis(el)).toBe("vertical");
  });

  test("display:grid grid-auto-flow:column → horizontal", () => {
    setStyle(el, "display: grid; grid-auto-flow: column;");
    expect(cssAxis(el)).toBe("horizontal");
  });

  // inline-grid

  test("display:inline-grid grid-auto-flow:column → horizontal", () => {
    setStyle(el, "display: inline-grid; grid-auto-flow: column;");
    expect(cssAxis(el)).toBe("horizontal");
  });

  // block family

  test("display:block → vertical", () => {
    setStyle(el, "display: block;");
    expect(cssAxis(el)).toBe("vertical");
  });

  test("display:flow-root → vertical", () => {
    setStyle(el, "display: flow-root;");
    expect(cssAxis(el)).toBe("vertical");
  });

  test("display:list-item → vertical", () => {
    setStyle(el, "display: list-item;");
    expect(cssAxis(el)).toBe("vertical");
  });

  // null cases

  test("display:inline → null", () => {
    setStyle(el, "display: inline;");
    expect(cssAxis(el)).toBeNull();
  });

  test("display:none → null", () => {
    setStyle(el, "display: none;");
    expect(cssAxis(el)).toBeNull();
  });

  test("display:contents → null", () => {
    setStyle(el, "display: contents;");
    expect(cssAxis(el)).toBeNull();
  });

  test("display:table → null", () => {
    setStyle(el, "display: table;");
    expect(cssAxis(el)).toBeNull();
  });

  test("display:inline-block → null", () => {
    setStyle(el, "display: inline-block;");
    expect(cssAxis(el)).toBeNull();
  });
});

// ── rectAxis — a lone child's before/after axis from its own shape ────────────

describe("rectAxis", () => {
  test("taller than wide → vertical (split top/bottom)", () => {
    expect(rectAxis(new DOMRect(0, 0, 40, 120))).toBe("vertical");
  });

  test("wider than tall → horizontal (split left/right)", () => {
    expect(rectAxis(new DOMRect(0, 0, 120, 40))).toBe("horizontal");
  });

  test("square → vertical (tie goes to block-flow default)", () => {
    expect(rectAxis(new DOMRect(0, 0, 50, 50))).toBe("vertical");
  });

  test("zero-size rect → vertical (degenerate tie)", () => {
    expect(rectAxis(new DOMRect(0, 0, 0, 0))).toBe("vertical");
  });
});

// ── resolveSlotAxis — single child flips at its own rect midpoint ─────────────

describe("resolveSlotAxis", () => {
  const text = (id: string): ComponentData => ({
    type: "Text",
    props: { id },
  });

  const stack = (id: string, items: ComponentData[]): ComponentData => ({
    type: "Stack",
    props: { id, items },
  });

  const dataWith = (items: ComponentData[]): Data => ({
    root: { props: {} },
    content: [stack("container", items)],
  });

  test("no children → null (no geometry to measure)", () => {
    const registry = stubRegistry({ container: new DOMRect(0, 0, 200, 300) });
    expect(resolveSlotAxis(dataWith([]), "container", "items", registry)).toBe(
      null,
    );
  });

  test("single tall child → vertical (its own rect midpoint, not container axis)", () => {
    const registry = stubRegistry({
      container: new DOMRect(0, 0, 200, 300),
      only: new DOMRect(80, 50, 40, 200), // taller than wide
    });
    expect(
      resolveSlotAxis(dataWith([text("only")]), "container", "items", registry),
    ).toBe("vertical");
  });

  test("single wide child → horizontal", () => {
    const registry = stubRegistry({
      container: new DOMRect(0, 0, 300, 200),
      only: new DOMRect(20, 80, 240, 40), // wider than tall
    });
    expect(
      resolveSlotAxis(dataWith([text("only")]), "container", "items", registry),
    ).toBe("horizontal");
  });

  test("single child not in the registry → null", () => {
    const registry = stubRegistry({ container: new DOMRect(0, 0, 200, 300) });
    expect(
      resolveSlotAxis(dataWith([text("only")]), "container", "items", registry),
    ).toBe(null);
  });

  test("two stacked children → vertical (measured pair, not single-child path)", () => {
    const registry = stubRegistry({
      a: new DOMRect(0, 0, 200, 100),
      b: new DOMRect(0, 200, 200, 100),
    });
    expect(
      resolveSlotAxis(
        dataWith([text("a"), text("b")]),
        "container",
        "items",
        registry,
      ),
    ).toBe("vertical");
  });

  test("two side-by-side children → horizontal", () => {
    const registry = stubRegistry({
      a: new DOMRect(0, 0, 100, 200),
      b: new DOMRect(200, 0, 100, 200),
    });
    expect(
      resolveSlotAxis(
        dataWith([text("a"), text("b")]),
        "container",
        "items",
        registry,
      ),
    ).toBe("horizontal");
  });
});
