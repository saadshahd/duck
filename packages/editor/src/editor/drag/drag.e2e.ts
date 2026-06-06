import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  hasDropIndicator,
  getDropZoneLabelText,
  getDropPositionChipText,
  getTileLabels,
  getActiveTileLabel,
  getActiveTileRect,
  getActiveDestinationLabel,
  dispatchDrag,
  sourceCenter,
  edgePoint,
  type Point,
} from "../overlay/testing.js";

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
    phase: "full",
  });

/** Start a drag without dropping — for testing indicators. */
const dragOver = async (page: Page, source: Locator, target: Locator) =>
  dispatchDrag(page, {
    from: await sourceCenter(source),
    to: await edgePoint(target, "bottom"),
    phase: "hold",
  });

/** Drag a source over a viewport point without dropping. */
const dragOverPoint = async (page: Page, source: Locator, point: Point) =>
  dispatchDrag(page, {
    from: await sourceCenter(source),
    to: point,
    phase: "hold",
  });

/** Full drag-and-drop onto a viewport point. */
const dragAndDropPoint = async (page: Page, source: Locator, point: Point) =>
  dispatchDrag(page, {
    from: await sourceCenter(source),
    to: point,
    phase: "full",
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

    await description.click();
    await page.waitForTimeout(300);

    // The draggable affordance lands on the selected component's registered root
    // element, which wraps the inner <p>. Re-selection after a drop must
    // re-attach it — proving a second drag can begin.
    const descriptionRoot = description.locator("..");
    expect(await descriptionRoot.getAttribute("draggable")).toBe("true");

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

// --- Shift-cycle over the destination stack ---

/** Press and hold the source, glide to a point, and hold the pointer there.
 *  Leaves the drag live so the caller can tap Shift and release. */
async function holdDragAt(page: Page, source: Locator, point: Point) {
  const start = await sourceCenter(source);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(point.x, point.y, { steps: 8 });
  await page.waitForTimeout(80);
}

/** Tap Shift once during a live native drag. Chromium emits no dragover for a
 *  modifier-only change without pointer motion, so a 1px nudge follows BOTH
 *  key-down (rising edge → step) and key-up (falling edge → re-arm the next
 *  rising edge). Without the key-up nudge shiftKey stays latched true and no
 *  further step ever fires. */
async function tapShift(page: Page, at: Point) {
  await page.keyboard.down("Shift");
  await page.mouse.move(at.x + 1, at.y, { steps: 1 });
  await page.waitForTimeout(120);
  await page.keyboard.up("Shift");
  await page.mouse.move(at.x, at.y, { steps: 1 });
  await page.waitForTimeout(80);
}

test.describe("Shift-cycle destination stack", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  const cardTitle = (page: Page) => page.locator('h3:has-text("Zero Chrome")');
  const card = (page: Page) => cardTitle(page).locator("..");

  const cardCenter = (page: Page): Promise<Point> => sourceCenter(card(page));

  test("shift tap steps the active destination; repeated taps wrap", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    const at = await cardCenter(page);
    await holdDragAt(page, heading, at);

    // First tap selects within 500ms.
    await tapShift(page, at);
    const first = await getActiveDestinationLabel(page);

    const seen = first ? [first] : [];
    for (let i = 0; i < 12; i++) {
      await tapShift(page, at);
      const label = await getActiveDestinationLabel(page);
      if (label) seen.push(label);
    }
    await page.mouse.up();

    expect(first).toBe("Card › header");
    // Deepest container's slots come first, in declaration order.
    expect(seen.slice(0, 3)).toEqual([
      "Card › header",
      "Card › body",
      "Card › footer",
    ]);
    // Then beside-in-parent climbs the ancestry (non-Card entries appear).
    expect(seen.some((l) => !l.startsWith("Card ›"))).toBe(true);
    // The cycle is a closed loop: header recurs after a full revolution.
    expect(seen.slice(1)).toContain("Card › header");
  });

  test("drop into the empty footer via its carved bottom band", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    const box = await card(page).boundingBox();
    if (!box) throw new Error("Card not visible");
    // Bottom carved band — previously given to the sibling role by the gate.
    const footerBand: Point = {
      x: box.x + box.width / 2,
      y: box.y + box.height - 10,
    };

    await mouseDrag(page, heading, [footerBand], true);
    await page.waitForTimeout(500);

    const tags = await card(page).evaluate((el) =>
      [...el.children].map((c) => c.tagName),
    );
    // H1 lands as the card's last child (the footer slot's only element).
    expect(tags.at(-1)).toBe("H1");
  });

  test("cycle to beside-in-parent and drop lands the element as a sibling", async ({
    page,
  }) => {
    const grid = card(page).locator("..");
    const before = await grid.evaluate((el) => el.children.length);

    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    const at = await cardCenter(page);
    await holdDragAt(page, heading, at);

    // Step until the active destination is a non-Card (beside-in-parent) entry.
    let landed = false;
    for (let i = 0; i < 6 && !landed; i++) {
      await tapShift(page, at);
      const label = await getActiveDestinationLabel(page);
      if (label && !label.startsWith("Card ›")) landed = true;
    }
    await page.mouse.up();
    await page.waitForTimeout(500);

    expect(landed).toBe(true);
    const after = await grid.evaluate((el) => el.children.length);
    expect(after).toBe(before + 1);
  });
});

// --- Qualified line labels + position chip ---

test.describe("Line drop labels and position chip", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("between-siblings drag shows qualified slot label and position chip", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    const description = page.locator("p").first();
    await dragOver(page, heading, description);
    await page.waitForTimeout(300);

    const zoneLabel = await getDropZoneLabelText(page);
    expect(zoneLabel).not.toBeNull();
    expect(zoneLabel).toMatch(/›/);

    const chipText = await getDropPositionChipText(page);
    expect(chipText).not.toBeNull();
    expect(chipText).toMatch(/^(before|after) /);
  });
});
