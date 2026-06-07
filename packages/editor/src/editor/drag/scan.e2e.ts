import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  dragEnd,
  dragOverAt,
  dragStart,
  getActiveDestinationLabel,
  readResolution,
  readTileRects,
  readTiles,
  type Point,
} from "../overlay/testing.js";

/**
 * Real-pointer 4px-step scan certifying that the drag overlay's resolution at
 * every pointer position matches actual child ownership — on the demo Card and
 * on the deliberately irregular Panel (band carving, sub-floor yield, scatter).
 *
 * Two resolution paths, both certified:
 *  - Carry: fully real `page.mouse.move` while carrying. Carry resolves the
 *    DEEPEST slot-bearing container under the pointer to its first slot, so
 *    ground truth for a center-line point inside a container is that container's
 *    first-slot label. Carry applies no tile hysteresis, so no boundary lag here.
 *  - Drag: stepped `dragover` whose target comes from `document.elementFromPoint`
 *    at each point (real hit-testing, never dispatched at a known element).
 *    elementFromPoint over a measured child hits the CHILD, so production paints
 *    a between-siblings LINE there, not a tile — a tile is only aimed where the
 *    pointer lands on the container's own background (slot-band region). The
 *    exact tile-ownership assertion therefore samples container-background points
 *    whose expected slot is computed IN-TEST from measured child DOM rects via
 *    the midpoint rule (boundary between adjacent slots = midpoint of their child
 *    gap; first/last extend to the container edge), plus the documented 24px
 *    carved band for an empty interior slot. Samples sit >=8px clear of every
 *    band boundary so the 8px tile hysteresis never flips the expected slot.
 */

const STEP = 4;
/** Mirrors TILE_HYSTERESIS in drag/resolve-indicator.ts — keep in sync. */
const HYSTERESIS = 8;
/** Keep the scan clear of the container's own border, where the deepest
 *  container flips to the parent. */
const EDGE = 6;

// --- Demo catalog ground truth (the demo owns its catalog) ---

/** One slot's ground-truth role for the drag scan. `child` is the text of the
 *  slot's measured child (absent for an empty slot). `kind`:
 *   - `tile`: a normal measured slot that paints a band — assert exact ownership.
 *   - `carved`: an empty interior slot that paints a fixed 24px carved band.
 *   - `yield`: a sub-floor slot whose band collapses — it must never paint. */
type SlotTruth =
  | { slot: string; kind: "tile"; child: string }
  | { slot: string; kind: "carved" }
  | { slot: string; kind: "yield"; child: string };

type Container = {
  title: string;
  /** The slot-bearing container element. */
  container: (page: Page) => Locator;
  /** Source element to drag/carry into the container. */
  source: (page: Page) => Locator;
  /** Every slot label the container may legitimately paint. */
  slots: readonly string[];
  /** Tiled (measured bands) vs discrete (centered marker stack). */
  tiled: boolean;
  /** Per-slot ground truth in tiling (top-to-bottom) order. */
  truth: readonly SlotTruth[];
};

const ctaSource = (page: Page) =>
  page.locator('button:has-text("Get started")').first();

// The Card's slots render as direct children of the card div (BareSlot is a
// Fragment), so the container is one hop up from the title.
const CARD: Container = {
  title: "Zero Chrome",
  container: (page) => page.locator("h3:has-text('Zero Chrome')").locator(".."),
  source: (page) => page.locator("h1").first(),
  slots: ["Card › header", "Card › body", "Card › footer"],
  tiled: true,
  truth: [
    { slot: "Card › header", kind: "tile", child: "Zero Chrome" },
    {
      slot: "Card › body",
      kind: "tile",
      child:
        "No panels, no toolbars. The rendered page is the editor. Everything is contextual — appears on interaction, disappears when done.",
    },
    { slot: "Card › footer", kind: "carved" },
  ],
};

// Panel slots are wrapped in layout divs, so the container is two hops up.
// Stack layout: `divider` is empty (24px carved band between head and body),
// `note`'s 4px sliver falls sub-floor (its band yields — never paints), and
// head/divider/body tile cleanly.
const PANEL_STACK: Container = {
  title: "Stack panel",
  container: (page) =>
    page.locator("h3:has-text('Stack panel')").locator("..").locator(".."),
  source: ctaSource,
  slots: ["Panel › head", "Panel › divider", "Panel › body", "Panel › note"],
  tiled: true,
  truth: [
    { slot: "Panel › head", kind: "tile", child: "Stack panel" },
    { slot: "Panel › divider", kind: "carved" },
    {
      slot: "Panel › body",
      kind: "tile",
      child: "Measured body content fills this slot with a real box.",
    },
    { slot: "Panel › note", kind: "yield", child: "sliver" },
  ],
};

// Scatter layout: children are absolutely positioned so their projections
// interleave on both axes → discrete fallback (a centered marker stack).
const PANEL_SCATTER: Container = {
  title: "Scatter",
  container: (page) =>
    page.locator("h3:has-text('Scatter')").locator("..").locator(".."),
  source: ctaSource,
  slots: ["Panel › head", "Panel › divider", "Panel › body", "Panel › note"],
  tiled: false,
  truth: [],
};

// --- Geometry: measured child rects, relative to the container ---

type ChildRect = { top: number; bottom: number };

const childRects = (
  container: Locator,
  texts: readonly string[],
): Promise<{
  containerTop: number;
  containerHeight: number;
  cx: number;
  rects: Record<string, ChildRect | null>;
}> =>
  container.evaluate((cont, texts) => {
    const cb = cont.getBoundingClientRect();
    const byText = (t: string) =>
      [...document.querySelectorAll("h1,h3,p,div")].find(
        (e) => (e as HTMLElement).textContent?.trim() === t,
      );
    const rect = (t: string) => {
      const e = byText(t);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { top: b.top - cb.top, bottom: b.bottom - cb.top };
    };
    return {
      containerTop: cb.top,
      containerHeight: cb.height,
      cx: cb.x + cb.width / 2,
      rects: Object.fromEntries(texts.map((t) => [t, rect(t)])),
    };
  }, texts);

/**
 * Expected (slot, sample-point) pairs for the exact tile-ownership assertion,
 * computed from measured child DOM rects — independent ground truth, not a
 * read-back of the overlay:
 *   - Tile boundary between two adjacent measured slots = midpoint of the gap
 *     between their children; the first/last band extends to the container edge.
 *   - An empty interior slot ("carved") owns a 24px band centered on the
 *     boundary between its measured neighbours.
 * Each sample point is placed >=8px inside its band so tile hysteresis cannot
 * flip the expected slot. Yielded and discrete slots contribute no sample.
 */
function bandSamples(args: {
  truth: readonly SlotTruth[];
  rects: Record<string, ChildRect | null>;
  containerHeight: number;
  cx: number;
  containerTop: number;
}): Array<{ slot: string; point: Point }> {
  const { truth, rects, containerHeight, cx, containerTop } = args;
  /** Mirrors TILE_FLOOR in layout/tiles.ts — carved-band width; keep in sync. */
  const CARVE = 24;

  const childOf = (s: SlotTruth): ChildRect | null =>
    "child" in s ? rects[s.child] : null;
  const measured = truth.filter(
    (s): s is Extract<SlotTruth, { kind: "tile" }> => s.kind === "tile",
  );

  const at = (relY: number): Point => ({ x: cx, y: containerTop + relY });
  const out: Array<{ slot: string; point: Point }> = [];

  // Boundaries between consecutive measured (tile) slots, midpoint of the gap.
  const bound = (i: number): number => {
    if (i <= 0) return 0;
    if (i >= measured.length) return containerHeight;
    const prev = childOf(measured[i - 1])!;
    const next = childOf(measured[i])!;
    return (prev.bottom + next.top) / 2;
  };

  // A carved empty slot reserves a 24px band at the boundary between its
  // measured neighbours, pinned to the container edge when it is declaration
  // first/last (mirrors carveBands in tiles.ts). Keyed by the measured-boundary
  // index `mi` (= number of measured tiles before it) so survivors shrink away.
  type Carve = { slot: string; mi: number; lo: number; hi: number };
  const carves: Carve[] = truth.flatMap((s, idx) => {
    if (s.kind !== "carved") return [];
    const mi = truth.slice(0, idx).filter((t) => t.kind === "tile").length;
    const b = bound(mi);
    const lo =
      b <= 0
        ? 0
        : b >= containerHeight
          ? containerHeight - CARVE
          : b - CARVE / 2;
    return [{ slot: s.slot, mi, lo, hi: lo + CARVE }];
  });
  const carveBefore = (i: number) => carves.find((c) => c.mi === i);

  // Sample each measured slot in the BACKGROUND portion of its band (not over
  // its child, so elementFromPoint hits the container), shrunk away from any
  // carved band on its edges, kept >=8px clear of every boundary.
  measured.forEach((s, i) => {
    const child = childOf(s)!;
    const lo = carveBefore(i)?.hi ?? bound(i);
    const hi = carveBefore(i + 1)?.lo ?? bound(i + 1);
    const above = { lo, hi: Math.min(child.top, hi) };
    const below = { lo: Math.max(child.bottom, lo), hi };
    const pick = above.hi - above.lo >= below.hi - below.lo ? above : below;
    const mid = (pick.lo + pick.hi) / 2;
    if (mid - lo >= HYSTERESIS && hi - mid >= HYSTERESIS)
      out.push({ slot: s.slot, point: at(mid) });
  });

  // Carved bands are pure background — sample their centers directly.
  for (const c of carves)
    out.push({ slot: c.slot, point: at((c.lo + c.hi) / 2) });

  return out;
}

// --- Drag stepping: real hit-testing per step (extends dispatchDrag's model) ---

type Resolution = {
  tile: string | null;
  discrete: boolean;
  line: boolean;
  root: string | null;
  noTarget: boolean;
};

/** Step a live drag across `points`, reading the resolution after each. */
async function dragStepRead(
  page: Page,
  points: readonly Point[],
): Promise<Array<Resolution | null>> {
  const out: Array<Resolution | null> = [];
  for (const p of points) {
    await dragOverAt(page, p);
    out.push(await readResolution(page));
  }
  return out;
}

// --- Carry parity scan: fully real pointer, same ground truth as drag ---

/** Lift `container.source` into carry mode (Space) and move the pointer over the
 *  container so a destination resolves. Returns once carrying. */
async function liftIntoCarry(page: Page, container: Container, at: Point) {
  await container.source(page).click();
  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  await page.mouse.move(at.x, at.y, { steps: 1 });
  await page.waitForTimeout(40);
}

/**
 * R5 parity: pointer-over-tile in CARRY must resolve the SAME slot the DRAG scan
 * certifies at that point. Carry hit-tests the deepest container's tile through
 * the shared `aimedTile`, so its per-slot ownership is identical to drag's — the
 * pre-R5 "everything resolves to the first slot" bug is gone, and the demo Card's
 * body/footer are pointer-reachable in carry.
 *
 * For a tiled container we assert exact slot ownership at the SAME band-sample
 * points drag uses (computed from measured child rects). For a discrete container
 * (no aimable bands) carry has nothing to hit-test, so it legitimately falls back
 * to the first slot everywhere — asserted separately.
 */
async function carryScan(page: Page, container: Container) {
  const el = container.container(page);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = (await el.boundingBox())!;
  const cx = box.x + box.width / 2;
  const points: Point[] = [];
  for (let y = box.y + EDGE; y <= box.y + box.height - EDGE; y += STEP)
    points.push({ x: cx, y });

  await liftIntoCarry(page, container, { x: cx, y: box.y + box.height / 2 });

  // (1) Zero dead zones along the center-line: every point inside the container
  // names exactly one destination (carry hit-tests the container background
  // directly, so no point is left without an outcome).
  let dead = 0;
  for (const p of points) {
    await page.mouse.move(p.x, p.y, { steps: 1 });
    await page.waitForTimeout(20);
    const dest = await getActiveDestinationLabel(page);
    if (!dest) dead++;
  }
  expect(dead, `carry dead zones in ${container.title}`).toBe(0);

  if (container.tiled) await assertCarryTiled(page, container, box);
  else await assertCarryDiscrete(page, container);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
}

/** Tiled container: exact slot ownership at the drag-derived band samples, plus a
 *  vacuity guard and a reachability pin that every non-yielded slot is hit. */
async function assertCarryTiled(
  page: Page,
  container: Container,
  box: { x: number; y: number; width: number; height: number },
) {
  const childTexts = container.truth.flatMap((s) =>
    "child" in s ? [s.child] : [],
  );
  const geom = await childRects(container.container(page), childTexts);
  const samples = bandSamples({
    truth: container.truth,
    rects: geom.rects,
    containerHeight: geom.containerHeight,
    cx: geom.cx,
    containerTop: geom.containerTop,
  });

  const hit = new Set<string>();
  for (const s of samples) {
    await page.mouse.move(s.point.x, s.point.y, { steps: 1 });
    await page.waitForTimeout(20);
    const dest = await getActiveDestinationLabel(page);
    expect(
      dest,
      `carry slot ownership at "${s.slot}" (${Math.round(s.point.y - box.y)}px) in ${container.title}`,
    ).toBe(s.slot);
    if (dest) hit.add(dest);
  }

  // Vacuity: the ownership loop must have run.
  expect(
    samples.length,
    `vacuity: no band samples computed for ${container.title}`,
  ).toBeGreaterThan(0);

  // Reachability: every non-yielded slot is reached by the pointer — the core
  // parity win is that body/footer (not just the first slot) resolve in carry.
  const reachable = container.truth
    .filter((s) => s.kind !== "yield")
    .map((s) => s.slot);
  for (const slot of reachable)
    expect(
      hit.has(slot),
      `carry reachability of "${slot}" in ${container.title}`,
    ).toBe(true);
}

/** Discrete container: no measured bands, but its labelled markers are
 *  first-class hit-targets. Aiming at each marker's painted center resolves that
 *  marker's slot — the per-marker resolution law is exercised in detail in
 *  marker-aim.e2e.ts; here we pin the parity that carry reaches more than the
 *  first slot, by hitting every marker center and collecting the resolved slots. */
async function assertCarryDiscrete(page: Page, container: Container) {
  const el = container.container(page);
  const box = (await el.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: 1,
  });
  await page.waitForTimeout(40);

  const rects = (await readTileRects(page)) ?? [];
  expect(rects.length, `discrete markers painted in ${container.title}`).toBe(
    container.slots.length,
  );

  const resolved = new Set<string>();
  for (const r of rects) {
    await page.mouse.move((r.left + r.right) / 2, (r.top + r.bottom) / 2, {
      steps: 1,
    });
    await page.waitForTimeout(20);
    const dest = await getActiveDestinationLabel(page);
    expect(
      dest,
      `carry aim at marker "${r.label}" center resolves its slot in ${container.title}`,
    ).toBe(r.label);
    if (dest) resolved.add(dest);
  }
  expect(
    [...resolved].sort(),
    `carry reaches every scatter slot via markers in ${container.title}`,
  ).toEqual([...container.slots].sort());
}

// --- Drag scan: stepped dragover with real hit-testing ---

async function dragScan(page: Page, container: Container) {
  const el = container.container(page);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = (await el.boundingBox())!;
  const cx = box.x + box.width / 2;

  const points: Point[] = [];
  for (let y = box.y + EDGE; y <= box.y + box.height - EDGE; y += STEP)
    points.push({ x: cx, y });

  const source = container.source(page);
  await source.click();
  await page.waitForTimeout(300);

  await dragStart(page, source);
  const reads = await dragStepRead(page, points);

  // --- Zero dead zones + no phantom tiles across the whole center-line scan ---
  const valid = new Set(container.slots);
  const deadZones: Point[] = [];
  const phantomTiles: Array<{ at: Point; tile: string }> = [];
  reads.forEach((res, i) => {
    const resolved = res && (res.tile || res.line || res.root || res.noTarget);
    if (!resolved) deadZones.push(points[i]);
    if (res?.tile && !valid.has(res.tile))
      phantomTiles.push({ at: points[i], tile: res.tile });
  });
  expect(
    deadZones.length,
    `drag dead zones in ${container.title}: ${JSON.stringify(deadZones.slice(0, 4))}`,
  ).toBe(0);
  expect(phantomTiles, `phantom tiles in ${container.title}`).toEqual([]);

  if (container.tiled) await assertTiled(page, container, box);
  else await assertDiscrete(page, container, box);

  await dragEnd(page, points.at(-1)!);
  await page.waitForTimeout(100);
}

/** Tiled container: exact tile-ownership at container-background sample points
 *  (computed from child rects), the carved-band pin, the band-set pin, and the
 *  vacuity guard. */
async function assertTiled(
  page: Page,
  container: Container,
  box: { x: number; y: number; width: number; height: number },
) {
  const childTexts = container.truth.flatMap((s) =>
    "child" in s ? [s.child] : [],
  );
  const geom = await childRects(container.container(page), childTexts);
  const samples = bandSamples({
    truth: container.truth,
    rects: geom.rects,
    containerHeight: geom.containerHeight,
    cx: geom.cx,
    containerTop: geom.containerTop,
  });

  // (1) Exact tile-ownership — runs only at points where the pointer is over the
  // container background and a tile is therefore aimed. Counted for vacuity.
  let exactCount = 0;
  for (const s of samples) {
    await dragOverAt(page, s.point);
    const res = await readResolution(page);
    if (!res?.tile) continue; // background not hit here — not an ownership point
    exactCount++;
    expect(
      res.tile,
      `tile ownership at slot "${s.slot}" (${Math.round(s.point.y - box.y)}px) in ${container.title}`,
    ).toBe(s.slot);
  }

  // (2) Vacuity guard: the exact-ownership branch MUST have executed, or this
  // test certifies nothing — fail loud if no tile-ownership point was reached.
  expect(
    exactCount,
    `vacuity: no exact tile-ownership points exercised in ${container.title}`,
  ).toBeGreaterThan(0);

  // (3) Band-set pin: the painted (non-discrete) tile labels are exactly the
  // surviving tiled + carved slots — yielded slots never appear as a tile.
  // Re-hover a guaranteed background point so the container's tiles are live.
  await dragOverAt(page, samples[0].point);
  const expectedSet = container.truth
    .filter((s) => s.kind !== "yield")
    .map((s) => s.slot)
    .sort();
  const tiles = (await readTiles(page)) ?? [];
  const paintedSet = [
    ...new Set(tiles.filter((t) => !t.discrete).map((t) => t.label)),
  ].sort();
  expect(paintedSet, `painted tile-label set in ${container.title}`).toEqual(
    expectedSet,
  );
}

/** Discrete container: the overlay paints a centered marker stack carrying
 *  `data-discrete`, with every slot label present and none yielded. */
async function assertDiscrete(
  page: Page,
  container: Container,
  box: { x: number; y: number; width: number; height: number },
) {
  const center: Point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await dragOverAt(page, center);

  const res = await readResolution(page);
  expect(res?.discrete, `discrete resolution in ${container.title}`).toBe(true);

  const tiles = (await readTiles(page)) ?? [];
  expect(
    tiles.length > 0 && tiles.every((t) => t.discrete),
    `all tiles discrete in ${container.title}`,
  ).toBe(true);
  const labels = [...new Set(tiles.map((t) => t.label))].sort();
  expect(labels, `discrete stack labels in ${container.title}`).toEqual(
    [...container.slots].sort(),
  );
}

// --- Specs ---

test.describe("Real-pointer slot-targeting scan", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("carry scan: card", async ({ page }) => {
    await carryScan(page, CARD);
  });

  test("carry scan: irregular panel (stack)", async ({ page }) => {
    await carryScan(page, PANEL_STACK);
  });

  test("carry scan: irregular panel (scatter)", async ({ page }) => {
    await carryScan(page, PANEL_SCATTER);
  });

  test("drag scan: card", async ({ page }) => {
    await dragScan(page, CARD);
  });

  test("drag scan: irregular panel (stack)", async ({ page }) => {
    await dragScan(page, PANEL_STACK);
  });

  test("drag scan: irregular panel (scatter)", async ({ page }) => {
    await dragScan(page, PANEL_SCATTER);
  });
});
