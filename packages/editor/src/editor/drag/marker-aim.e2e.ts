import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  getActiveDestinationLabel,
  readResolution,
  readTileRects,
  sourceCenter,
  type Point,
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

// --- Drag stepping with real hit-testing (mirrors scan.e2e.ts) ---

async function dragStart(page: Page, source: Locator) {
  const from = await sourceCenter(source);
  await page.evaluate((f) => {
    const dt = new DataTransfer();
    (window as unknown as { __dt: DataTransfer }).__dt = dt;
    document.elementFromPoint(f.x, f.y)?.dispatchEvent(
      new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: f.x,
        clientY: f.y,
        dataTransfer: dt,
      }),
    );
  }, from);
}

async function dragOverAt(page: Page, p: Point) {
  await page.evaluate((pt) => {
    const dt = (window as unknown as { __dt: DataTransfer }).__dt;
    const init: DragEventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: pt.x,
      clientY: pt.y,
      dataTransfer: dt,
    };
    const tgt = document.elementFromPoint(pt.x, pt.y);
    tgt?.dispatchEvent(new DragEvent("dragenter", init));
    tgt?.dispatchEvent(new DragEvent("dragover", init));
  }, p);
  await page.waitForTimeout(20);
}

async function dragEnd(page: Page, p: Point) {
  await page.evaluate((pt) => {
    const dt = (window as unknown as { __dt: DataTransfer }).__dt;
    document.elementFromPoint(pt.x, pt.y)?.dispatchEvent(
      new DragEvent("dragend", {
        bubbles: true,
        composed: true,
        clientX: pt.x,
        clientY: pt.y,
        dataTransfer: dt,
      }),
    );
  }, p);
}

// --- Carry lift (mirrors scan.e2e.ts) ---

async function liftIntoCarry(page: Page, source: Locator, at: Point) {
  await source.click();
  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  await page.mouse.move(at.x, at.y, { steps: 1 });
  await page.waitForTimeout(40);
}

// --- Specs ---

test.describe("Discrete markers are hit-targets in both modalities", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("carry: aiming at each scatter marker center resolves that marker's slot", async ({
    page,
  }) => {
    const el = scatterContainer(page);
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
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
      await page.waitForTimeout(20);
      expect(
        await getActiveDestinationLabel(page),
        `carry aim at marker "${label}" center resolves its slot`,
      ).toBe(label);
    }

    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
  });

  test("drag: aiming at each scatter marker center resolves that marker's slot", async ({
    page,
  }) => {
    const el = scatterContainer(page);
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const box = (await el.boundingBox())!;
    const center: Point = {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    };

    const source = ctaSource(page);
    await source.click();
    await page.waitForTimeout(300);
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
    await page.waitForTimeout(100);
  });
});
