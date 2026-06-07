import { test, expect, type Page, type Locator } from "@playwright/test";
import { dispatchDrag, readTileRects, sourceCenter } from "./testing.js";

/**
 * Discrete-marker presentation law (R6), acceptance-tested on the demo Scatter
 * panel — the one container whose children interleave on both axes, forcing the
 * discrete fallback. Two invariants the overlay must honour:
 *
 *  1. ANCHORING — each marker's vertical center rides its slot's real child-rect
 *     midpoint. Scatter children sit at distinct y offsets (head 10, body 30,
 *     divider 60, note 90 px from the panel top), so the markers must land at
 *     those distinct positions, NOT in a centered equidistant column.
 *  2. CONTAINMENT — every marker (it hosts the only information-bearing element,
 *     the slot label) is clamped inside the container it names; no marker paints
 *     above the container top or below its bottom.
 *
 * Hit-testing of markers is out of scope here — this certifies geometry only.
 */

const SCATTER = (page: Page): Locator =>
  page.locator("h3:has-text('Scatter')").locator("..").locator("..");

const ctaSource = (page: Page): Locator =>
  page.locator('button:has-text("Get started")').first();

/** Slot label → the text of that slot's single measured child in the Scatter
 *  panel. The marker carries the slot label; its child is measured by text. */
const SLOT_CHILD: Record<string, string> = {
  "Panel › head": "Scatter",
  "Panel › divider": "divider",
  "Panel › body": "body",
  "Panel › note": "note",
};

/** Viewport rects of the Scatter panel and each named child, measured live. */
const geometry = (container: Locator, childTexts: readonly string[]) =>
  container.evaluate((cont, texts) => {
    const cb = cont.getBoundingClientRect();
    const byText = (t: string) =>
      [...document.querySelectorAll("h1,h3,p,div")].find(
        (e) => (e as HTMLElement).textContent?.trim() === t,
      );
    const childRect = (t: string) => {
      const e = byText(t);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { top: b.top, bottom: b.bottom };
    };
    return {
      container: {
        top: cb.top,
        bottom: cb.bottom,
        left: cb.left,
        right: cb.right,
      },
      children: Object.fromEntries(texts.map((t) => [t, childRect(t)])),
    };
  }, childTexts);

test.describe("Discrete-marker presentation — Scatter panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("markers anchor to child geometry and clamp inside the container", async ({
    page,
  }) => {
    const container = SCATTER(page);
    await container.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    const box = (await container.boundingBox())!;
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    // Lift the source and hold a drag over the panel center so the discrete
    // marker stack paints.
    const source = ctaSource(page);
    await source.click();
    await page.waitForTimeout(300);
    const from = await sourceCenter(source);
    await dispatchDrag(page, { from, to: center, phase: "hold" });
    await page.waitForTimeout(40);

    const geom = await geometry(container, Object.values(SLOT_CHILD));
    const markers = (await readTileRects(page)) ?? [];

    // Vacuity: a marker painted for every scatter slot.
    expect(
      markers.map((m) => m.label).sort(),
      "markers painted for every scatter slot",
    ).toEqual(Object.keys(SLOT_CHILD).sort());

    for (const marker of markers) {
      const child = geom.children[SLOT_CHILD[marker.label]];
      expect(child, `child measured for ${marker.label}`).not.toBeNull();
      const markerMid = (marker.top + marker.bottom) / 2;

      // ANCHORING: marker center sits within its slot's child rect.
      expect(
        markerMid,
        `${marker.label} marker center within its child rect`,
      ).toBeGreaterThanOrEqual(child!.top - 1);
      expect(
        markerMid,
        `${marker.label} marker center within its child rect`,
      ).toBeLessThanOrEqual(child!.bottom + 1);

      // CONTAINMENT: the whole marker is inside the container it names.
      expect(
        marker.top,
        `${marker.label} marker top inside container`,
      ).toBeGreaterThanOrEqual(geom.container.top - 1);
      expect(
        marker.bottom,
        `${marker.label} marker bottom inside container`,
      ).toBeLessThanOrEqual(geom.container.bottom + 1);
    }

    // ANCHORING (negative): the markers are NOT an equidistant centered column —
    // the scatter children occupy distinct y bands, so their midpoints differ by
    // unequal gaps. A centered column would space them uniformly.
    const mids = markers
      .map((m) => (m.top + m.bottom) / 2)
      .sort((a, b) => a - b);
    const gaps = mids.slice(1).map((m, i) => m - mids[i]);
    const uniform = gaps.every((g) => Math.abs(g - gaps[0]) < 2);
    expect(uniform, "markers must not form an equidistant column").toBe(false);

    await dispatchDrag(page, { from, to: center, phase: "release" });
    await page.waitForTimeout(100);
  });
});
