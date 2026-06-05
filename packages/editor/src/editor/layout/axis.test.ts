import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { detectAxis, cssAxis } from "./axis.js";

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
