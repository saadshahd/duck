import { describe, test, expect } from "bun:test";
import { TILE_FLOOR, tileSlots, type SlotInput, type Tiling } from "./tiles.js";

const rect = (x: number, y: number, w: number, h: number): DOMRect =>
  new DOMRect(x, y, w, h);

const xywh = (r: DOMRect) => ({ x: r.x, y: r.y, w: r.width, h: r.height });

const shape = (t: Tiling) =>
  t.kind === "tiled"
    ? {
        kind: t.kind,
        axis: t.axis,
        yielded: t.yielded,
        tiles: t.tiles.map((tile) => ({
          slotKey: tile.slotKey,
          rect: xywh(tile.rect),
        })),
      }
    : t;

// containerRect used across most cases: 200 wide, 300 tall
const C = rect(0, 0, 200, 300);

describe("tileSlots — single slot", () => {
  test("single measured slot fills the container (axis from larger spread)", () => {
    // tall container, slot taller than wide → vertical wins; tile = whole container
    expect(
      shape(
        tileSlots({
          containerRect: C,
          slots: [{ slotKey: "only", rect: rect(10, 50, 100, 200) }],
        }),
      ),
    ).toEqual({
      kind: "tiled",
      axis: "vertical",
      yielded: [],
      tiles: [{ slotKey: "only", rect: { x: 0, y: 0, w: 200, h: 300 } }],
    });
  });

  test("single empty slot fills the container", () => {
    expect(
      shape(
        tileSlots({
          containerRect: C,
          slots: [{ slotKey: "only" }],
          cssAxis: "vertical",
        }),
      ),
    ).toEqual({
      kind: "tiled",
      axis: "vertical",
      yielded: [],
      tiles: [{ slotKey: "only", rect: { x: 0, y: 0, w: 200, h: 300 } }],
    });
  });
});

describe("tileSlots — axis selection", () => {
  test("two measured vertical stack", () => {
    expect(
      shape(
        tileSlots({
          containerRect: C,
          slots: [
            { slotKey: "top", rect: rect(0, 0, 200, 100) },
            { slotKey: "bottom", rect: rect(0, 200, 200, 100) },
          ],
        }),
      ),
    ).toEqual({
      kind: "tiled",
      axis: "vertical",
      yielded: [],
      tiles: [
        { slotKey: "top", rect: { x: 0, y: 0, w: 200, h: 150 } },
        { slotKey: "bottom", rect: { x: 0, y: 150, w: 200, h: 150 } },
      ],
    });
  });

  test("two measured horizontal row", () => {
    const wide = rect(0, 0, 300, 100);
    expect(
      shape(
        tileSlots({
          containerRect: wide,
          slots: [
            { slotKey: "left", rect: rect(0, 0, 100, 100) },
            { slotKey: "right", rect: rect(200, 0, 100, 100) },
          ],
        }),
      ),
    ).toEqual({
      kind: "tiled",
      axis: "horizontal",
      yielded: [],
      tiles: [
        { slotKey: "left", rect: { x: 0, y: 0, w: 150, h: 100 } },
        { slotKey: "right", rect: { x: 150, y: 0, w: 150, h: 100 } },
      ],
    });
  });

  test("both axes qualify → larger spread wins (horizontal)", () => {
    // diagonal: cleanly ordered on both axes. horizontal span 300 > vertical span 100.
    const wide = rect(0, 0, 300, 100);
    const result = tileSlots({
      containerRect: wide,
      slots: [
        { slotKey: "a", rect: rect(0, 0, 50, 30) },
        { slotKey: "b", rect: rect(250, 70, 50, 30) },
      ],
    });
    expect(result.kind === "tiled" && result.axis).toBe("horizontal");
  });

  test("both axes qualify → larger spread wins (vertical)", () => {
    const tall = rect(0, 0, 100, 300);
    const result = tileSlots({
      containerRect: tall,
      slots: [
        { slotKey: "a", rect: rect(0, 0, 30, 50) },
        { slotKey: "b", rect: rect(70, 250, 30, 50) },
      ],
    });
    expect(result.kind === "tiled" && result.axis).toBe("vertical");
  });

  test("interleaved on both axes → discrete with all keys", () => {
    // two rects overlapping on both X and Y projections
    expect(
      tileSlots({
        containerRect: C,
        slots: [
          { slotKey: "a", rect: rect(0, 0, 150, 150) },
          { slotKey: "b", rect: rect(50, 50, 150, 150) },
        ],
      }),
    ).toEqual({ kind: "discrete", slotKeys: ["a", "b"] });
  });
});

describe("tileSlots — band geometry", () => {
  test("gap midpoint split is exact; first/last bands reach container edges", () => {
    // top ends at 100, bottom starts at 200 → midpoint 150. container 0..300.
    expect(
      shape(
        tileSlots({
          containerRect: C,
          slots: [
            { slotKey: "top", rect: rect(0, 20, 200, 80) }, // 20..100
            { slotKey: "bottom", rect: rect(0, 200, 200, 80) }, // 200..280
          ],
        }),
      ),
    ).toEqual({
      kind: "tiled",
      axis: "vertical",
      yielded: [],
      tiles: [
        { slotKey: "top", rect: { x: 0, y: 0, w: 200, h: 150 } },
        { slotKey: "bottom", rect: { x: 0, y: 150, w: 200, h: 150 } },
      ],
    });
  });

  test("three measured: interior boundaries at gap midpoints", () => {
    // a 0..50, b 100..150, c 200..250 → boundaries 75, 175
    expect(
      shape(
        tileSlots({
          containerRect: C,
          slots: [
            { slotKey: "a", rect: rect(0, 0, 200, 50) },
            { slotKey: "b", rect: rect(0, 100, 200, 50) },
            { slotKey: "c", rect: rect(0, 200, 200, 50) },
          ],
        }),
      ),
    ).toEqual({
      kind: "tiled",
      axis: "vertical",
      yielded: [],
      tiles: [
        { slotKey: "a", rect: { x: 0, y: 0, w: 200, h: 75 } },
        { slotKey: "b", rect: { x: 0, y: 75, w: 200, h: 100 } },
        { slotKey: "c", rect: { x: 0, y: 175, w: 200, h: 125 } },
      ],
    });
  });

  test("clamps a measured rect that extends beyond the container", () => {
    expect(
      shape(
        tileSlots({
          containerRect: C,
          slots: [{ slotKey: "only", rect: rect(-50, -50, 400, 500) }],
        }),
      ),
    ).toEqual({
      kind: "tiled",
      axis: "vertical",
      yielded: [],
      tiles: [{ slotKey: "only", rect: { x: 0, y: 0, w: 200, h: 300 } }],
    });
  });
});

describe("tileSlots — gapless invariant", () => {
  const cases: { name: string; slots: SlotInput[]; container: DOMRect }[] = [
    {
      name: "two vertical",
      container: C,
      slots: [
        { slotKey: "a", rect: rect(0, 0, 200, 100) },
        { slotKey: "b", rect: rect(0, 200, 200, 100) },
      ],
    },
    {
      name: "three vertical",
      container: C,
      slots: [
        { slotKey: "a", rect: rect(0, 0, 200, 50) },
        { slotKey: "b", rect: rect(0, 100, 200, 50) },
        { slotKey: "c", rect: rect(0, 200, 200, 50) },
      ],
    },
    {
      name: "empty between two measured",
      container: C,
      slots: [
        { slotKey: "a", rect: rect(0, 0, 200, 100) },
        { slotKey: "mid" },
        { slotKey: "b", rect: rect(0, 200, 200, 100) },
      ],
    },
  ];

  for (const { name, slots, container } of cases) {
    test(`gapless + covers container: ${name}`, () => {
      const t = tileSlots({ containerRect: container, slots });
      if (t.kind !== "tiled") throw new Error("expected tiled");
      const sorted = [...t.tiles].sort((x, y) => x.rect.top - y.rect.top);
      expect(sorted[0].rect.top).toBe(container.top);
      expect(sorted[sorted.length - 1].rect.bottom).toBe(container.bottom);
      sorted.forEach((tile, i) => {
        if (i > 0) expect(tile.rect.top).toBe(sorted[i - 1].rect.bottom);
        expect(tile.rect.left).toBe(container.left);
        expect(tile.rect.right).toBe(container.right);
      });
    });
  }
});

describe("tileSlots — sub-floor measured slot yields", () => {
  test("measured slot whose band is below floor yields; survivors re-split over the container", () => {
    // a 0..5 and b 10..15 clustered at the top, c 290..300 far below.
    // bands before absorption: a 0..7.5 (sub-floor), b 7.5..152.5, c 152.5..300.
    // only `a` is sub-floor → yields. b and c re-split over the full container:
    // b 0..152.5, c 152.5..300 (survivors only grow, no cascade).
    const result = tileSlots({
      containerRect: C,
      slots: [
        { slotKey: "a", rect: rect(0, 0, 200, 5) },
        { slotKey: "b", rect: rect(0, 10, 200, 5) },
        { slotKey: "c", rect: rect(0, 290, 200, 10) },
      ],
    });
    expect(shape(result)).toEqual({
      kind: "tiled",
      axis: "vertical",
      yielded: ["a"],
      tiles: [
        { slotKey: "b", rect: { x: 0, y: 0, w: 200, h: 152.5 } },
        { slotKey: "c", rect: { x: 0, y: 152.5, w: 200, h: 147.5 } },
      ],
    });
  });
});

describe("tileSlots — empty slots among measured", () => {
  test("empty between two measured: carved at the inter-band boundary, neighbors shrink", () => {
    // a 0..100, b 200..300 → measured boundary 150. empty 'mid' carved 138..162.
    expect(
      shape(
        tileSlots({
          containerRect: C,
          slots: [
            { slotKey: "a", rect: rect(0, 0, 200, 100) },
            { slotKey: "mid" },
            { slotKey: "b", rect: rect(0, 200, 200, 100) },
          ],
        }),
      ),
    ).toEqual({
      kind: "tiled",
      axis: "vertical",
      yielded: [],
      tiles: [
        { slotKey: "a", rect: { x: 0, y: 0, w: 200, h: 138 } },
        { slotKey: "mid", rect: { x: 0, y: 138, w: 200, h: 24 } },
        { slotKey: "b", rect: { x: 0, y: 162, w: 200, h: 138 } },
      ],
    });
  });

  test("empty declaration-first: flush at the low edge", () => {
    expect(
      shape(
        tileSlots({
          containerRect: C,
          slots: [
            { slotKey: "head" },
            { slotKey: "a", rect: rect(0, 0, 200, 100) },
            { slotKey: "b", rect: rect(0, 200, 200, 100) },
          ],
        }),
      ),
    ).toEqual({
      kind: "tiled",
      axis: "vertical",
      yielded: [],
      tiles: [
        { slotKey: "head", rect: { x: 0, y: 0, w: 200, h: 24 } },
        { slotKey: "a", rect: { x: 0, y: 24, w: 200, h: 126 } },
        { slotKey: "b", rect: { x: 0, y: 150, w: 200, h: 150 } },
      ],
    });
  });

  test("empty declaration-last: flush at the high edge", () => {
    expect(
      shape(
        tileSlots({
          containerRect: C,
          slots: [
            { slotKey: "a", rect: rect(0, 0, 200, 100) },
            { slotKey: "b", rect: rect(0, 200, 200, 100) },
            { slotKey: "foot" },
          ],
        }),
      ),
    ).toEqual({
      kind: "tiled",
      axis: "vertical",
      yielded: [],
      tiles: [
        { slotKey: "a", rect: { x: 0, y: 0, w: 200, h: 150 } },
        { slotKey: "b", rect: { x: 0, y: 150, w: 200, h: 126 } },
        { slotKey: "foot", rect: { x: 0, y: 276, w: 200, h: 24 } },
      ],
    });
  });

  test("two consecutive empty slots between the same neighbors stack in declaration order", () => {
    // boundary 150; two empties total 48px → start 126, e1 126..150, e2 150..174
    expect(
      shape(
        tileSlots({
          containerRect: C,
          slots: [
            { slotKey: "a", rect: rect(0, 0, 200, 100) },
            { slotKey: "e1" },
            { slotKey: "e2" },
            { slotKey: "b", rect: rect(0, 200, 200, 100) },
          ],
        }),
      ),
    ).toEqual({
      kind: "tiled",
      axis: "vertical",
      yielded: [],
      tiles: [
        { slotKey: "a", rect: { x: 0, y: 0, w: 200, h: 126 } },
        { slotKey: "e1", rect: { x: 0, y: 126, w: 200, h: 24 } },
        { slotKey: "e2", rect: { x: 0, y: 150, w: 200, h: 24 } },
        { slotKey: "b", rect: { x: 0, y: 174, w: 200, h: 126 } },
      ],
    });
  });

  test("carve-induced sub-floor → discrete with all keys", () => {
    // 40x40 container (square → vertical axis wins). One empty carves 24px out
    // of the 40px measured band, leaving 16px < floor → discrete.
    const small = rect(0, 0, 40, 40);
    expect(
      tileSlots({
        containerRect: small,
        slots: [{ slotKey: "a", rect: rect(0, 0, 40, 40) }, { slotKey: "e" }],
      }),
    ).toEqual({ kind: "discrete", slotKeys: ["a", "e"] });
  });
});

describe("tileSlots — all empty", () => {
  test("cssAxis vertical → equal split in declaration order", () => {
    expect(
      shape(
        tileSlots({
          containerRect: C,
          slots: [{ slotKey: "a" }, { slotKey: "b" }, { slotKey: "c" }],
          cssAxis: "vertical",
        }),
      ),
    ).toEqual({
      kind: "tiled",
      axis: "vertical",
      yielded: [],
      tiles: [
        { slotKey: "a", rect: { x: 0, y: 0, w: 200, h: 100 } },
        { slotKey: "b", rect: { x: 0, y: 100, w: 200, h: 100 } },
        { slotKey: "c", rect: { x: 0, y: 200, w: 200, h: 100 } },
      ],
    });
  });

  test("cssAxis horizontal → equal split along x", () => {
    expect(
      shape(
        tileSlots({
          containerRect: C,
          slots: [{ slotKey: "a" }, { slotKey: "b" }],
          cssAxis: "horizontal",
        }),
      ),
    ).toEqual({
      kind: "tiled",
      axis: "horizontal",
      yielded: [],
      tiles: [
        { slotKey: "a", rect: { x: 0, y: 0, w: 100, h: 300 } },
        { slotKey: "b", rect: { x: 100, y: 0, w: 100, h: 300 } },
      ],
    });
  });

  test("no cssAxis → discrete with all keys", () => {
    expect(
      tileSlots({
        containerRect: C,
        slots: [{ slotKey: "a" }, { slotKey: "b" }],
      }),
    ).toEqual({ kind: "discrete", slotKeys: ["a", "b"] });
  });

  test("no slots → empty discrete", () => {
    expect(tileSlots({ containerRect: C, slots: [] })).toEqual({
      kind: "discrete",
      slotKeys: [],
    });
  });
});

describe("axis tie-breaker with single measured slot", () => {
  test("cssAxis wins over the lone child's aspect ratio", () => {
    // Tall container (300×600), one measured slot whose rect is WIDER than tall —
    // the old spread tie-break would pick horizontal; cssAxis overrides to vertical.
    // header carved at 0..24 (declaration-first → flush to top),
    // footer carved at 576..600 (declaration-last → flush to bottom),
    // body fills the remainder 24..576.
    expect(
      shape(
        tileSlots({
          containerRect: rect(0, 0, 300, 600),
          slots: [
            { slotKey: "header" },
            { slotKey: "body", rect: rect(10, 250, 280, 100) },
            { slotKey: "footer" },
          ],
          cssAxis: "vertical",
        }),
      ),
    ).toEqual({
      kind: "tiled",
      axis: "vertical",
      yielded: [],
      tiles: [
        { slotKey: "header", rect: { x: 0, y: 0, w: 300, h: 24 } },
        { slotKey: "body", rect: { x: 0, y: 24, w: 300, h: 552 } },
        { slotKey: "footer", rect: { x: 0, y: 576, w: 300, h: 24 } },
      ],
    });
  });

  test("spread tie-break still applies with 2+ measured slots", () => {
    // Wide container (600×300), two measured slots stacked vertically.
    // hBands both project to 10..110 → not ordered → only vertical qualifies.
    // breakTie is not reached; vertical wins from ordering alone.
    // Boundaries: a 10..110 and b 150..290 → boundary at (110+150)/2=130.
    const containerRect = rect(0, 0, 600, 300);
    const result = tileSlots({
      containerRect,
      slots: [
        { slotKey: "a", rect: rect(10, 10, 100, 100) },
        { slotKey: "b", rect: rect(10, 150, 100, 140) },
      ],
      cssAxis: "horizontal",
    });
    if (result.kind !== "tiled") throw new Error("expected tiled");
    expect(shape(result)).toEqual({
      kind: "tiled",
      axis: "vertical",
      yielded: [],
      tiles: [
        { slotKey: "a", rect: { x: 0, y: 0, w: 600, h: 130 } },
        { slotKey: "b", rect: { x: 0, y: 130, w: 600, h: 170 } },
      ],
    });
  });
});

describe("tileSlots — purity & ordering", () => {
  test("does not mutate inputs", () => {
    const slots: SlotInput[] = [
      { slotKey: "a", rect: rect(0, 0, 200, 100) },
      { slotKey: "b", rect: rect(0, 200, 200, 100) },
    ];
    const snapshot = JSON.stringify(
      slots.map((s) => ({ k: s.slotKey, r: s.rect && xywh(s.rect) })),
    );
    const container = rect(0, 0, 200, 300);
    tileSlots({ containerRect: container, slots });
    expect(
      JSON.stringify(
        slots.map((s) => ({ k: s.slotKey, r: s.rect && xywh(s.rect) })),
      ),
    ).toBe(snapshot);
    expect(xywh(container)).toEqual({ x: 0, y: 0, w: 200, h: 300 });
  });

  test("tiles emitted in along-axis order regardless of declaration order", () => {
    // declare bottom first, top second
    const t = tileSlots({
      containerRect: C,
      slots: [
        { slotKey: "bottom", rect: rect(0, 200, 200, 100) },
        { slotKey: "top", rect: rect(0, 0, 200, 100) },
      ],
    });
    if (t.kind !== "tiled") throw new Error("expected tiled");
    expect(t.tiles.map((x) => x.slotKey)).toEqual(["top", "bottom"]);
  });

  test("same input → same output", () => {
    const args = {
      containerRect: C,
      slots: [
        { slotKey: "a", rect: rect(0, 0, 200, 100) },
        { slotKey: "b", rect: rect(0, 200, 200, 100) },
      ],
    };
    expect(shape(tileSlots(args))).toEqual(shape(tileSlots(args)));
  });

  test("TILE_FLOOR is 24", () => {
    expect(TILE_FLOOR).toBe(24);
  });
});
