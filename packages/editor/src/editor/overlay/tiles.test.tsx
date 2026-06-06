import { describe, test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Tiling } from "../layout/index.js";
import { Tiles, leaderRect } from "./tiles.js";

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
    carved: [],
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
      carved: [],
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
    carved: [],
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

describe("leaderRect", () => {
  test("returns a 1px rect from container left to marker left at marker vertical center", () => {
    const containerR = new DOMRect(10, 0, 400, 300);
    const markerR = new DOMRect(130, 100, 160, 24);
    expect(leaderRect(containerR, markerR)).toEqual(
      new DOMRect(10, 112, 120, 1),
    );
  });

  test("returns a rect with width 0 when marker is flush with the container", () => {
    const containerR = new DOMRect(130, 0, 400, 300);
    const markerR = new DOMRect(130, 100, 160, 24);
    expect(leaderRect(containerR, markerR)).toEqual(
      new DOMRect(130, 112, 0, 1),
    );
  });

  test("returns a rect with width 0 when marker is to the left of the container", () => {
    const containerR = new DOMRect(200, 0, 400, 300);
    const markerR = new DOMRect(130, 100, 160, 24);
    expect(leaderRect(containerR, markerR)).toEqual(
      new DOMRect(200, 112, 0, 1),
    );
  });
});

describe("Tiles — carved bands", () => {
  const tiling: Tiling = {
    kind: "tiled",
    axis: "vertical",
    tiles: [
      { slotKey: "header", rect: new DOMRect(0, 0, 400, 100) },
      { slotKey: "body", rect: new DOMRect(0, 100, 400, 200) },
    ],
    yielded: [],
    carved: ["header"],
  };
  const labels = { header: "Card › header", body: "Card › body" };

  test("carved slot tile carries data-carved attribute", () => {
    const markup = renderToStaticMarkup(
      <Tiles tiling={tiling} containerRect={container} labels={labels} />,
    );
    const host = dom(markup);
    const headerTile = [
      ...host.querySelectorAll("[data-role='slot-tile']"),
    ].find((el) => el.textContent === "Card › header");
    const bodyTile = [...host.querySelectorAll("[data-role='slot-tile']")].find(
      (el) => el.textContent === "Card › body",
    );
    expect(headerTile?.hasAttribute("data-carved")).toBe(true);
    expect(bodyTile?.hasAttribute("data-carved")).toBe(false);
  });
});

describe("Tiles — discrete leader lines", () => {
  const tiling: Tiling = {
    kind: "discrete",
    slotKeys: ["header", "body", "footer"],
  };
  const labels = {
    header: "Card › header",
    body: "Card › body",
    footer: "Card › footer",
  };
  // Container offset from left so leader lines have positive width.
  const offsetContainer = new DOMRect(10, 0, 400, 300);

  test("each discrete marker gets a leader line", () => {
    const markup = renderToStaticMarkup(
      <Tiles tiling={tiling} containerRect={offsetContainer} labels={labels} />,
    );
    const host = dom(markup);
    const leaders = [...host.querySelectorAll("[data-role='slot-leader']")];
    const tiles = [...host.querySelectorAll("[data-role='slot-tile']")];
    expect(leaders.length).toBe(tiles.length);
  });
});
