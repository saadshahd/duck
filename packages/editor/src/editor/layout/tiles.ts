import type { Axis } from "./axis.js";

export const TILE_FLOOR = 24;

export type Tile = { slotKey: string; rect: DOMRect };

export type Tiling =
  | {
      kind: "tiled";
      axis: Axis;
      tiles: readonly Tile[];
      yielded: readonly string[];
    }
  | { kind: "discrete"; slotKeys: readonly string[] };

export type SlotInput = { slotKey: string; rect?: DOMRect };

type Interval = { start: number; end: number };

type Band = { slotKey: string; band: Interval };

type AxisGeometry = {
  lo: (r: DOMRect) => number;
  hi: (r: DOMRect) => number;
  build: (band: Interval, container: DOMRect) => DOMRect;
};

const AXIS_GEOMETRY: Record<Axis, AxisGeometry> = {
  vertical: {
    lo: (r) => r.top,
    hi: (r) => r.bottom,
    build: (band, c) =>
      new DOMRect(c.left, band.start, c.width, band.end - band.start),
  },
  horizontal: {
    lo: (r) => r.left,
    hi: (r) => r.right,
    build: (band, c) =>
      new DOMRect(band.start, c.top, band.end - band.start, c.height),
  },
};

const length = (iv: Interval): number => iv.end - iv.start;

const byStart = <T extends { band: Interval }>(a: T, b: T): number =>
  a.band.start - b.band.start;

const clamp = (interval: Interval, bounds: Interval): Interval => ({
  start: Math.min(Math.max(interval.start, bounds.start), bounds.end),
  end: Math.max(Math.min(interval.end, bounds.end), bounds.start),
});

const projection = (
  rect: DOMRect,
  axis: Axis,
  container: DOMRect,
): Interval => {
  const g = AXIS_GEOMETRY[axis];
  return clamp(
    { start: g.lo(rect), end: g.hi(rect) },
    { start: g.lo(container), end: g.hi(container) },
  );
};

/** Cleanly ordered, non-interleaved: sort by start, no interval overlaps the
 *  next (touching is OK). */
const isOrdered = (intervals: readonly Interval[]): boolean => {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  return sorted.every((iv, i) => i === 0 || sorted[i - 1].end <= iv.start);
};

const spread = (intervals: readonly Interval[]): number =>
  Math.max(...intervals.map((iv) => iv.end)) -
  Math.min(...intervals.map((iv) => iv.start));

const discrete = (slots: readonly SlotInput[]): Tiling => ({
  kind: "discrete",
  slotKeys: slots.map((s) => s.slotKey),
});

const toTiling = (
  bands: readonly Band[],
  yielded: readonly string[],
  axis: Axis,
  container: DOMRect,
): Tiling => {
  const g = AXIS_GEOMETRY[axis];
  return {
    kind: "tiled",
    axis,
    tiles: [...bands]
      .sort(byStart)
      .map((b) => ({ slotKey: b.slotKey, rect: g.build(b.band, container) })),
    yielded,
  };
};

/** Equal split of the container into one band per slot along `axis`,
 *  in declaration order. */
const equalSplit = (
  slots: readonly SlotInput[],
  axis: Axis,
  container: DOMRect,
): Tiling => {
  const g = AXIS_GEOMETRY[axis];
  const lo = g.lo(container);
  const step = (g.hi(container) - lo) / slots.length;
  return toTiling(
    slots.map((s, i) => ({
      slotKey: s.slotKey,
      band: { start: lo + i * step, end: lo + (i + 1) * step },
    })),
    [],
    axis,
    container,
  );
};

/** Bands from intervals in projection order: boundaries at gap midpoints, ends
 *  flush to the container span. Gapless by construction. */
const bandsFrom = (intervals: readonly Band[], span: Interval): Band[] => {
  const ordered = [...intervals].sort(byStart);
  return ordered.map((p, i) => ({
    slotKey: p.slotKey,
    band: {
      start:
        i === 0 ? span.start : (ordered[i - 1].band.end + p.band.start) / 2,
      end:
        i === ordered.length - 1
          ? span.end
          : (p.band.end + ordered[i + 1].band.start) / 2,
    },
  }));
};

/** Sub-floor measured bands yield; their span is reabsorbed by re-splitting the
 *  survivors over the full container span. Survivors only grow → no cascade. */
const absorbSubFloor = (
  bands: readonly Band[],
  span: Interval,
): { kept: Band[]; yielded: string[] } => {
  const surviving = bands.filter((b) => length(b.band) >= TILE_FLOOR);
  const yielded = bands
    .filter((b) => length(b.band) < TILE_FLOOR)
    .map((b) => b.slotKey);
  if (!yielded.length) return { kept: [...bands], yielded: [] };
  if (!surviving.length) return { kept: [], yielded };
  return {
    kept: bandsFrom(
      surviving.map((b) => ({ slotKey: b.slotKey, band: b.band })),
      span,
    ),
    yielded,
  };
};

/** Boundary position for an empty slot: midpoint between the bands of its
 *  nearest measured neighbors in declaration order, or the container edge when
 *  it is declaration-first/last. */
const emptyBoundary = (
  declIndex: number,
  slots: readonly SlotInput[],
  bands: Map<string, Interval>,
  span: Interval,
): number => {
  const before = slots
    .slice(0, declIndex)
    .reverse()
    .find((s) => bands.has(s.slotKey));
  const after = slots.slice(declIndex + 1).find((s) => bands.has(s.slotKey));
  if (!before) return span.start;
  if (!after) return span.end;
  return (bands.get(before.slotKey)!.end + bands.get(after.slotKey)!.start) / 2;
};

/** Carve a TILE_FLOOR band for each empty slot at its interpolated boundary,
 *  shrinking the measured bands it overlaps. Consecutive empties at the same
 *  boundary stack in declaration order. */
const carveEmpties = (
  slots: readonly SlotInput[],
  measured: readonly Band[],
  span: Interval,
): Band[] => {
  const bandByKey = new Map(measured.map((b) => [b.slotKey, b.band]));

  const grouped = slots.reduce((acc, s, declIndex) => {
    if (s.rect) return acc;
    const at = emptyBoundary(declIndex, slots, bandByKey, span);
    return acc.set(at, [...(acc.get(at) ?? []), s.slotKey]);
  }, new Map<number, string[]>());

  const carved = [...grouped.entries()].flatMap(([at, keys]) => {
    const total = keys.length * TILE_FLOOR;
    const start =
      at <= span.start
        ? span.start
        : at >= span.end
          ? span.end - total
          : at - total / 2;
    return keys.map((slotKey, i) => ({
      slotKey,
      band: {
        start: start + i * TILE_FLOOR,
        end: start + (i + 1) * TILE_FLOOR,
      },
    }));
  });

  const shrunk = measured.map((m) => {
    const band = carved.reduce((b, c) => {
      if (b.start >= c.band.end || b.end <= c.band.start) return b;
      if (b.start >= c.band.start && b.end <= c.band.end)
        return { start: c.band.start, end: c.band.start };
      if (c.band.start <= b.start) return { start: c.band.end, end: b.end };
      if (c.band.end >= b.end) return { start: b.start, end: c.band.start };
      return { start: b.start, end: c.band.start };
    }, m.band);
    return { slotKey: m.slotKey, band };
  });

  return [...shrunk, ...carved];
};

export const tileSlots = (args: {
  containerRect: DOMRect;
  slots: readonly SlotInput[];
  cssAxis?: Axis;
}): Tiling => {
  const { containerRect, slots, cssAxis } = args;
  if (!slots.length) return { kind: "discrete", slotKeys: [] };

  const measured = slots.flatMap((s) =>
    s.rect ? [{ slotKey: s.slotKey, rect: s.rect }] : [],
  );

  if (!measured.length) {
    return cssAxis
      ? equalSplit(slots, cssAxis, containerRect)
      : discrete(slots);
  }

  const project = (axis: Axis): Band[] =>
    measured.map((m) => ({
      slotKey: m.slotKey,
      band: projection(m.rect, axis, containerRect),
    }));

  const vBands = project("vertical");
  const hBands = project("horizontal");
  const vOk = isOrdered(vBands.map((b) => b.band));
  const hOk = isOrdered(hBands.map((b) => b.band));
  if (!vOk && !hOk) return discrete(slots);

  const axis: Axis =
    vOk && hOk
      ? spread(vBands.map((b) => b.band)) >= spread(hBands.map((b) => b.band))
        ? "vertical"
        : "horizontal"
      : vOk
        ? "vertical"
        : "horizontal";

  const g = AXIS_GEOMETRY[axis];
  const span: Interval = {
    start: g.lo(containerRect),
    end: g.hi(containerRect),
  };
  const measuredBands = bandsFrom(axis === "vertical" ? vBands : hBands, span);
  const { kept, yielded } = absorbSubFloor(measuredBands, span);
  if (!kept.length) return discrete(slots);

  if (slots.every((s) => s.rect))
    return toTiling(kept, yielded, axis, containerRect);

  const carved = carveEmpties(slots, kept, span);
  if (carved.some((b) => length(b.band) < TILE_FLOOR - 1e-9))
    return discrete(slots);
  return toTiling(carved, yielded, axis, containerRect);
};
