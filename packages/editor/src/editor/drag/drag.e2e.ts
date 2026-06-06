import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  hasDropIndicator,
  getDropZoneLabelText,
  getTileLabels,
  getActiveTileLabel,
  getActiveTileRect,
} from "../overlay/testing.js";

type Point = { x: number; y: number };

const center = (box: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Point => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const sourceCenter = async (source: Locator): Promise<Point> => {
  const box = await source.boundingBox();
  if (!box) throw new Error("Source not visible");
  return center(box);
};

const edgePoint = async (
  target: Locator,
  edge: "top" | "bottom",
): Promise<Point> => {
  const box = await target.boundingBox();
  if (!box) throw new Error("Target not visible");
  return {
    x: box.x + box.width / 2,
    y: edge === "top" ? box.y + 2 : box.y + box.height - 2,
  };
};

/**
 * Dispatch a native drag sequence between two viewport points.
 * pragmatic-drag-and-drop uses native HTML5 drag events with a shared
 * DataTransfer, so the whole sequence runs in a single evaluate call.
 */
async function dispatchDrag(
  page: Page,
  args: { from: Point; to: Point; drop: boolean },
) {
  await page.evaluate(({ from, to, drop }) => {
    const dt = new DataTransfer();
    const opts = (p: { x: number; y: number }): DragEventInit => ({
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: p.x,
      clientY: p.y,
      dataTransfer: dt,
    });
    const src = document.elementFromPoint(from.x, from.y)!;
    const tgt = document.elementFromPoint(to.x, to.y)!;
    src.dispatchEvent(new DragEvent("dragstart", opts(from)));
    tgt.dispatchEvent(new DragEvent("dragenter", opts(to)));
    tgt.dispatchEvent(new DragEvent("dragover", opts(to)));
    if (!drop) return;
    tgt.dispatchEvent(new DragEvent("drop", opts(to)));
    src.dispatchEvent(new DragEvent("dragend", opts(to)));
  }, args);
}

/** Simulate a full native drag-and-drop onto a sibling's edge. */
const dragAndDrop = async (
  page: Page,
  source: Locator,
  target: Locator,
  targetEdge: "top" | "bottom" = "bottom",
) =>
  dispatchDrag(page, {
    from: await sourceCenter(source),
    to: await edgePoint(target, targetEdge),
    drop: true,
  });

/** Start a drag without dropping — for testing indicators. */
const dragOver = async (page: Page, source: Locator, target: Locator) =>
  dispatchDrag(page, {
    from: await sourceCenter(source),
    to: await edgePoint(target, "bottom"),
    drop: false,
  });

/** Drag a source over a viewport point without dropping. */
const dragOverPoint = async (page: Page, source: Locator, point: Point) =>
  dispatchDrag(page, {
    from: await sourceCenter(source),
    to: point,
    drop: false,
  });

/** Full drag-and-drop onto a viewport point. */
const dragAndDropPoint = async (page: Page, source: Locator, point: Point) =>
  dispatchDrag(page, {
    from: await sourceCenter(source),
    to: point,
    drop: true,
  });

test.describe("Drag-to-reorder", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("selected element gets draggable attribute", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);
    expect(await heading.getAttribute("draggable")).toBe("true");
  });

  test("drag over sibling shows drop indicator", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    const description = page.locator("p").first();
    await dragOver(page, heading, description);
    await page.waitForTimeout(300);

    expect(await hasDropIndicator(page)).toBe(true);
  });

  test("drag over sibling shows drop zone label with container type", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    const description = page.locator("p").first();
    await dragOver(page, heading, description);
    await page.waitForTimeout(300);

    const label = await getDropZoneLabelText(page);
    expect(label).not.toBeNull();
    expect(label!.length).toBeGreaterThan(0);
  });

  test("drop reorders elements", async ({ page }) => {
    // Get initial text order in the hero section
    const heading = page.locator("h1");
    const heroSection = heading.locator("..");
    const initialFirst = await heroSection.locator("> *").first().textContent();

    // Select heading
    await heading.click();
    await page.waitForTimeout(300);

    // Drag heading to below the description (second sibling)
    const description = page.locator("p").first();
    await dragAndDrop(page, heading, description, "bottom");
    await page.waitForTimeout(500);

    // After reorder, heading should no longer be the first child
    const newFirst = await heroSection.locator("> *").first().textContent();
    expect(newFirst).not.toBe(initialFirst);
  });

  test("cannot drag while editing", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    // Double-click to enter inline edit
    await heading.dblclick();
    await page.waitForTimeout(300);

    // Element should not be draggable during edit
    const draggable = await heading.getAttribute("draggable");
    expect(draggable).not.toBe("true");
  });

  test("second drag works after first drop", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    const description = page.locator("p").first();
    await dragAndDrop(page, heading, description, "bottom");
    await page.waitForTimeout(500);

    // Re-select (now the description is first)
    await description.click();
    await page.waitForTimeout(300);

    // Should be able to drag again
    expect(await description.getAttribute("draggable")).toBe("true");

    // Drag back
    const movedHeading = page.locator("h1");
    await dragAndDrop(page, description, movedHeading, "top");
    await page.waitForTimeout(500);
  });
});

// --- Slot-aware container drops ---

/** Real-mouse drag: press on the source center, glide through waypoints with
 *  multiple steps so Chromium starts a native HTML5 drag (pragmatic-dnd's
 *  adapter), and optionally release at the final point. */
async function mouseDrag(
  page: Page,
  source: Locator,
  waypoints: readonly Point[],
  release: boolean,
) {
  const start = await sourceCenter(source);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const wp of waypoints) {
    await page.mouse.move(wp.x, wp.y, { steps: 8 });
    await page.waitForTimeout(60);
  }
  if (release) await page.mouse.up();
}

test.describe("Slot-aware container drops", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  const cardTitle = (page: Page) => page.locator('h3:has-text("Zero Chrome")');
  const card = (page: Page) => cardTitle(page).locator("..");

  /** Point in the gap below the card title, biased toward the header slot. */
  const headerGapPoint = async (page: Page): Promise<Point> => {
    const title = await cardTitle(page).boundingBox();
    const cardBox = await card(page).boundingBox();
    if (!title || !cardBox) throw new Error("Card not visible");
    return { x: cardBox.x + cardBox.width / 2, y: title.y + title.height + 2 };
  };

  test("container drop shows 'Component › slot' label", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await dragOverPoint(page, heading, await headerGapPoint(page));
    await page.waitForTimeout(300);

    expect(await getActiveTileLabel(page)).toBe("Card › header");
  });

  test("container hover paints gapless labeled tiles", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await mouseDrag(page, heading, [await headerGapPoint(page)], false);
    await page.waitForTimeout(300);

    const labels = await getTileLabels(page);
    expect(labels).toEqual(["Card › header", "Card › body", "Card › footer"]);

    await page.mouse.up();
  });

  test("tile label is visible before release", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await mouseDrag(page, heading, [await headerGapPoint(page)], false);
    await page.waitForTimeout(300);

    expect(await getActiveTileLabel(page)).toBe("Card › header");
    const rect = await getActiveTileRect(page);
    expect(rect).not.toBeNull();

    await page.mouse.up();
  });

  test("drop into a slot via its tile band inserts at the pointer position", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await dragAndDropPoint(page, heading, await headerGapPoint(page));
    await page.waitForTimeout(500);

    const tags = await card(page).evaluate((el) =>
      [...el.children].map((c) => c.tagName),
    );
    expect(tags.slice(0, 2)).toEqual(["H3", "H1"]);
  });

  test("move an element between slots of the same container", async ({
    page,
  }) => {
    const title = cardTitle(page);
    await title.click();
    await page.waitForTimeout(300);

    const desc = page.locator('p:has-text("No panels, no toolbars")');
    await dragAndDrop(page, title, desc, "bottom");
    await page.waitForTimeout(500);

    const tags = await card(page).evaluate((el) =>
      [...el.children].map((c) => c.tagName),
    );
    expect(tags).toEqual(["DIV", "H3"]);
  });
});
