import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  dragEnd,
  dragOverAt,
  dragStart,
  getActiveDestinationLabel,
  readResolution,
  readTileRects,
  selectElement,
  settle,
  type Point,
  openTestPage,
} from "../overlay/testing.js";

/**
 * R6 second half: discrete markers are first-class hit-targets in BOTH
 * modalities. A scattered container (children absolutely positioned so their
 * projections interleave on both axes) paints no measured bands — only its
 * labelled markers. Before this law those markers were decorative: drag/carry
 * over a scatter container resolved the first slot everywhere. Now pointing at a
 * marker's painted center resolves THAT marker's slot.
 *
 * Ground truth is the overlay's own painted marker rects (`readTileRects`): the
 * marker's viewport center is exactly the pointer target, and the resolved slot
 * label must equal that marker's label. Both paths are certified:
 *  - Carry: fully real `page.mouse.move`; resolution read from the active
 *    destination label.
 *  - Drag: stepped `dragover` whose target comes from `document.elementFromPoint`
 *    at the marker center (real hit-testing), resolution read from the active
 *    slot tile.
 *
 * Second law, certified here too: a single-child (scattered) slot has no
 * cross-sibling direction, so its before/after insert axis comes from the
 * CHILD'S OWN rect midpoint (`rectAxis` + `slotInsertIndex`), not container axis
 * detection. The body marker is anchored to that child's rect midpoint, so its
 * painted center IS the flip boundary. Carrying the CTA into the scatter body
 * slot and committing ABOVE vs BELOW the marker center flips the committed
 * document order — the observer is the resulting child order, read from the
 * live DOM.
 */

// The Scatter Panel: four slots (head, divider, body, note), each one child,
// absolutely positioned so the tiling falls discrete. The container is two hops
// up from the heading (slots wrapped in absolutely-positioned layout divs).
const scatterContainer = (page: Page): Locator =>
  page.locator("h3:has-text('Scatter')").locator("..").locator("..");

const ctaSource = (page: Page): Locator =>
  page.locator('button:has-text("Get started")').first();

const SCATTER_SLOTS = [
  "Panel › head",
  "Panel › divider",
  "Panel › body",
  "Panel › note",
] as const;

/** Center of each painted marker, keyed by its slot label — read from the live
 *  overlay so the aim point is the marker's real on-screen position. */
async function markerCenters(
  page: Page,
): Promise<Array<{ label: string; point: Point }>> {
  const rects = (await readTileRects(page)) ?? [];
  return rects.map((r) => ({
    label: r.label,
    point: { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 },
  }));
}

// --- Carry lift (mirrors scan.e2e.ts) ---

async function liftIntoCarry(page: Page, source: Locator, at: Point) {
  await selectElement(page, source);
  await page.keyboard.press("Space");
  // Space is discrete-priority (commit already flushed); carry arms on a
  // setTimeout(0) and the overlay paints on its rAF pass — two frames clears both.
  await settle(page);
  await page.mouse.move(at.x, at.y, { steps: 1 });
  // Carry names a destination at every point inside a container, so a non-null
  // label is the signal that this pointer position has actually resolved.
  await expect
    .poll(() => getActiveDestinationLabel(page), { intervals: [25] })
    .not.toBeNull();
}

// --- Single-child midpoint flip (rectAxis insert-index law) ---

/** Viewport center of the marker whose label ends in `slotKey`. */
async function markerCenterFor(page: Page, slotKey: string): Promise<Point> {
  const markers = await markerCenters(page);
  const marker = markers.find((m) => m.label.endsWith(slotKey));
  if (!marker) throw new Error(`no marker for slot "${slotKey}"`);
  return marker.point;
}

/** Order of the moved CTA ("Get started") relative to the body child ("body")
 *  inside the scatter container after a commit: "before" when the CTA precedes
 *  the body Text in document order, "after" when it follows. */
async function ctaVsBodyOrder(
  page: Page,
): Promise<"before" | "after" | "missing"> {
  return page.evaluate(() => {
    const text = (t: string) =>
      [...document.querySelectorAll("button,p,div,h3")].find(
        (e) => (e as HTMLElement).textContent?.trim() === t,
      );
    const cta = text("Get started");
    const body = text("body");
    if (!cta || !body) return "missing";
    return cta.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING
      ? "before"
      : "after";
  });
}

/** Carry the CTA into the scatter body slot, aim at a y offset from the body
 *  marker's center, and commit with Enter. The body marker is anchored to its
 *  single child's rect midpoint (`discreteMarkers`), so the marker's painted
 *  center IS the rectAxis flip boundary; the offset's sign selects the insert
 *  side. The offset stays within the 24px marker so the body slot keeps
 *  resolving. */
async function carryCtaToBody(page: Page, dy: number) {
  const el = scatterContainer(page);
  await el.scrollIntoViewIfNeeded();
  // Nothing scrolls smoothly in this app, so the scroll is done; settle covers
  // the overlay re-anchor that follows it.
  await settle(page);
  const box = (await el.boundingBox())!;
  const center: Point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  await liftIntoCarry(page, ctaSource(page), center);

  const marker = await markerCenterFor(page, "body");
  await page.mouse.move(marker.x, marker.y + dy, { steps: 1 });
  await settle(page);
  expect(
    await getActiveDestinationLabel(page),
    `carry aim near the body marker resolves the body slot (dy=${dy})`,
  ).toBe("Panel › body");

  await page.keyboard.press("Enter");
  // The move commits behind a view transition (animatedUpdate), so the DOM lands
  // a couple of frames later. The CTA arriving INSIDE the scatter container is
  // that commit; unlike the before/after order the callers assert, it is false
  // until the move happens, so this wait can never pass vacuously.
  await expect
    .poll(() =>
      scatterContainer(page).locator('button:has-text("Get started")').count(),
    )
    .toBe(1);
}

// --- Specs ---

test.describe("Single-child insert axis flips at the child's own midpoint", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  // The scatter body slot holds exactly one child, so it carries no cross-sibling
  // direction: `rectAxis` reads the child's own (taller-than-wide) rect as a
  // vertical stack and `slotInsertIndex` flips before/after at that child's
  // midpoint. A drop ABOVE the midpoint lands the CTA before the body child; a
  // drop BELOW lands it after. The committed document order is the observer.

  test("aiming above the body child's midpoint inserts the CTA before it", async ({
    page,
  }) => {
    await carryCtaToBody(page, -6);
    expect(
      await ctaVsBodyOrder(page),
      "above the child midpoint → CTA before the body child",
    ).toBe("before");
  });

  test("aiming below the body child's midpoint inserts the CTA after it", async ({
    page,
  }) => {
    await carryCtaToBody(page, 6);
    expect(
      await ctaVsBodyOrder(page),
      "below the child midpoint → CTA after the body child",
    ).toBe("after");
  });
});

test.describe("Discrete markers are hit-targets in both modalities", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("carry: aiming at each scatter marker center resolves that marker's slot", async ({
    page,
  }) => {
    const el = scatterContainer(page);
    await el.scrollIntoViewIfNeeded();
    // Nothing scrolls smoothly in this app, so the scroll is done; settle covers
    // the overlay re-anchor that follows it.
    await settle(page);
    const box = (await el.boundingBox())!;
    const center: Point = {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    };

    await liftIntoCarry(page, ctaSource(page), center);

    // The overlay now paints the discrete marker stack; read their live centers.
    const markers = await markerCenters(page);
    expect(
      markers.map((m) => m.label).sort(),
      "scatter paints one marker per slot",
    ).toEqual([...SCATTER_SLOTS].sort());

    for (const { label, point } of markers) {
      await page.mouse.move(point.x, point.y, { steps: 1 });
      // A pointermove is continuous-priority, so its commit can land after the
      // dispatch returns; two frames covers the commit plus the overlay rAF pass.
      await settle(page);
      expect(
        await getActiveDestinationLabel(page),
        `carry aim at marker "${label}" center resolves its slot`,
      ).toBe(label);
    }

    await page.keyboard.press("Escape");
  });

  test("drag: aiming at each scatter marker center resolves that marker's slot", async ({
    page,
  }) => {
    const el = scatterContainer(page);
    await el.scrollIntoViewIfNeeded();
    // Nothing scrolls smoothly in this app, so the scroll is done; settle covers
    // the overlay re-anchor that follows it.
    await settle(page);
    const box = (await el.boundingBox())!;
    const center: Point = {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    };

    const source = ctaSource(page);
    await selectElement(page, source);
    await dragStart(page, source);

    // Hover the container so the discrete marker stack paints, then read centers.
    await dragOverAt(page, center);
    const markers = await markerCenters(page);
    expect(
      markers.map((m) => m.label).sort(),
      "scatter paints one marker per slot",
    ).toEqual([...SCATTER_SLOTS].sort());

    for (const { label, point } of markers) {
      await dragOverAt(page, point);
      const res = await readResolution(page);
      expect(
        res?.tile,
        `drag aim at marker "${label}" center resolves its slot`,
      ).toBe(label);
    }

    await dragEnd(page, center);
  });
});
