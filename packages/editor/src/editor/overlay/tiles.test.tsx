import { describe, test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Tiling } from "../layout/index.js";
import { Tiles } from "./tiles.js";

const dom = (markup: string): HTMLDivElement => {
  const host = document.createElement("div");
  host.innerHTML = markup;
  return host;
};

const tiles = (markup: string) => [
  ...dom(markup).querySelectorAll("[data-role='slot-tile']"),
];

const render = (props: Parameters<typeof Tiles>[0]) =>
  tiles(renderToStaticMarkup(<Tiles {...props} />));

const labelsOf = (els: Element[]) => els.map((el) => el.textContent ?? "");

const activeOf = (els: Element[]) =>
  els
    .filter((el) => el.hasAttribute("data-active"))
    .map((el) => el.textContent);

const container = new DOMRect(0, 0, 400, 300);

describe("Tiles — tiled", () => {
  const tiling: Tiling = {
    kind: "tiled",
    axis: "vertical",
    tiles: [
      { slotKey: "header", rect: new DOMRect(0, 0, 400, 100) },
      { slotKey: "body", rect: new DOMRect(0, 100, 400, 200) },
    ],
    yielded: [],
  };
  const labels = { header: "Card › header", body: "Card › body" };

  test("one tile per slot, each with its full label", () => {
    const els = render({ tiling, containerRect: container, labels });
    expect(labelsOf(els)).toEqual(["Card › header", "Card › body"]);
  });

  test("data-active marks only the active slot", () => {
    const els = render({
      tiling,
      containerRect: container,
      labels,
      activeSlotKey: "body",
    });
    expect(activeOf(els)).toEqual(["Card › body"]);
  });

  test("no active slot → no tile is active", () => {
    const els = render({ tiling, containerRect: container, labels });
    expect(activeOf(els)).toEqual([]);
  });

  test("missing label falls back to the slot key", () => {
    const els = render({ tiling, containerRect: container, labels: {} });
    expect(labelsOf(els)).toEqual(["header", "body"]);
  });
});

describe("Tiles — discrete", () => {
  const tiling: Tiling = {
    kind: "discrete",
    slotKeys: ["header", "body", "footer"],
  };
  const labels = {
    header: "Card › header",
    body: "Card › body",
    footer: "Card › footer",
  };

  test("a discrete marker per slot, all flagged discrete", () => {
    const els = render({ tiling, containerRect: container, labels });
    expect(labelsOf(els)).toEqual([
      "Card › header",
      "Card › body",
      "Card › footer",
    ]);
    expect(els.every((el) => el.hasAttribute("data-discrete"))).toBe(true);
  });

  test("selection shown via data-active only", () => {
    const els = render({
      tiling,
      containerRect: container,
      labels,
      activeSlotKey: "footer",
    });
    expect(activeOf(els)).toEqual(["Card › footer"]);
  });
});

describe("Tiles — empty tilings", () => {
  test("tiled with no tiles renders nothing", () => {
    const tiling: Tiling = {
      kind: "tiled",
      axis: "vertical",
      tiles: [],
      yielded: [],
    };
    expect(render({ tiling, containerRect: container, labels: {} })).toEqual(
      [],
    );
  });

  test("discrete with no slots renders nothing", () => {
    const tiling: Tiling = { kind: "discrete", slotKeys: [] };
    expect(render({ tiling, containerRect: container, labels: {} })).toEqual(
      [],
    );
  });
});

describe("Tiles — yielded slots", () => {
  const tiling: Tiling = {
    kind: "tiled",
    axis: "vertical",
    tiles: [{ slotKey: "body", rect: new DOMRect(0, 0, 400, 300) }],
    yielded: ["caption"],
  };
  const labels = { body: "Card › body", caption: "Card › caption" };

  test("inactive yielded slot paints nothing", () => {
    const els = render({ tiling, containerRect: container, labels });
    expect(labelsOf(els)).toEqual(["Card › body"]);
  });

  test("active yielded slot renders a discrete marker", () => {
    const els = render({
      tiling,
      containerRect: container,
      labels,
      activeSlotKey: "caption",
    });
    const marker = els.find((el) => el.textContent === "Card › caption");
    expect(marker?.hasAttribute("data-discrete")).toBe(true);
    expect(marker?.hasAttribute("data-active")).toBe(true);
  });
});
