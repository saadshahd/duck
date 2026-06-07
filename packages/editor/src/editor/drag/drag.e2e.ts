import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  hasDropIndicator,
  getTileLabels,
  getActiveTileLabel,
  getActiveTileRect,
  getActiveDestinationLabel,
  readMoveGhost,
  countRetiredDestinationLabels,
  countCarvedTiles,
  countLeaderLines,
  readTiles,
  getCycleChipText,
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

// --- Ghost names the line destination (folded zone label + position chip) ---

test.describe("Move ghost on a between-siblings line drag", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("ghost names source → qualified slot destination · valid; no retired label survives", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    const description = page.locator("p").first();
    await dragOver(page, heading, description);
    await page.waitForTimeout(300);

    // A line drop still paints the spatial indicator (where), and the single ghost
    // names the resolution (what + validity). The zone label, position chip, and
    // root label are folded into the ghost — none survives.
    expect(await hasDropIndicator(page)).toBe(true);

    const ghost = await readMoveGhost(page);
    expect(ghost).not.toBeNull();
    expect(ghost!.sourceType).toBe("Heading");
    expect(ghost!.valid).toBe(true);
    expect(ghost!.destination).toMatch(/›/);

    expect(await countRetiredDestinationLabels(page)).toBe(0);
  });
});

// --- Band grammar: carved bands + discrete leader lines ---

test.describe("Band grammar — carved and discrete", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  /** The Stack panel container: two hops up from its heading (slots are wrapped
   *  in layout divs, same locator as PANEL_STACK in scan.e2e.ts). */
  const stackPanel = (page: Page) =>
    page.locator("h3:has-text('Stack panel')").locator("..").locator("..");

  /** The Scatter panel container. */
  const scatterPanel = (page: Page) =>
    page.locator("h3:has-text('Scatter')").locator("..").locator("..");

  /** CTA button lives near the panels — same source as scan.e2e.ts uses. */
  const ctaSource = (page: Page) =>
    page.locator('button:has-text("Get started")').first();

  test("dragging over the Stack panel paints at least one carved tile", async ({
    page,
  }) => {
    const source = ctaSource(page);
    await source.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await source.click();
    await page.waitForTimeout(300);

    // Target the carved divider band: the 24px slot between the head (h3 "Stack
    // panel") and the body. The midpoint of that carved band is just below the
    // head element's bottom edge — container background, no child there.
    const headBox = await page
      .locator("h3:has-text('Stack panel')")
      .boundingBox();
    const panelBox = await stackPanel(page).boundingBox();
    if (!headBox || !panelBox) throw new Error("Stack panel not visible");
    const dividerBandMid: Point = {
      x: panelBox.x + panelBox.width / 2,
      y: headBox.y + headBox.height + 12, // 12px into the carved divider band
    };

    await mouseDrag(page, source, [dividerBandMid], false);
    await page.waitForTimeout(300);

    const carved = await countCarvedTiles(page);
    await page.mouse.up();

    expect(carved, "at least one carved tile over stack panel").toBeGreaterThan(
      0,
    );
  });

  test("dragging over the Scatter panel: leader count equals discrete tile count", async ({
    page,
  }) => {
    const source = ctaSource(page);
    await source.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await source.click();
    await page.waitForTimeout(300);

    const panelBox = await scatterPanel(page).boundingBox();
    if (!panelBox) throw new Error("Scatter panel not visible");
    const center: Point = {
      x: panelBox.x + panelBox.width / 2,
      y: panelBox.y + panelBox.height / 2,
    };

    await mouseDrag(page, source, [center], false);
    await page.waitForTimeout(300);

    const tiles = (await readTiles(page)) ?? [];
    const discreteCount = tiles.filter((t) => t.discrete).length;
    const leaderCount = (await countLeaderLines(page)) ?? 0;
    await page.mouse.up();

    expect(
      discreteCount,
      "scatter panel paints discrete tiles",
    ).toBeGreaterThan(0);
    expect(leaderCount, "leader count equals discrete tile count").toBe(
      discreteCount,
    );
  });
});

// --- Same-parent container guard + cycle chip ---

/** The features grid contains three sibling Card containers. Dragging one Card
 *  over another resolves to a reorder-beside line, not the target's slot tiles.
 *  Shift-cycle dives into the target's slots and reveals the cycle counter chip. */
test.describe("Same-parent container guard and cycle chip", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  // Card siblings in the features grid
  const card1 = (page: Page) =>
    page.locator("h3:has-text('Zero Chrome')").locator("..");
  const card2 = (page: Page) =>
    page.locator("h3:has-text('MCP-Native')").locator("..");
  const card2Center = (page: Page): Promise<Point> => sourceCenter(card2(page));

  test("same-parent sibling card: drag shows line indicator, no slot tiles for target", async ({
    page,
  }) => {
    // Select card1 and start dragging over card2's interior.
    const source = card1(page);
    await source.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await source.click();
    await page.waitForTimeout(300);

    const at = await card2Center(page);
    await holdDragAt(page, source, at);
    await page.waitForTimeout(200);

    // Must show a line indicator (reorder-beside), not slot tiles.
    const hasLine = await hasDropIndicator(page);
    const tiles = (await readTiles(page)) ?? [];
    await page.mouse.up();

    expect(hasLine, "line indicator present for same-parent card drag").toBe(
      true,
    );
    expect(
      tiles.filter((t) => !t.discrete).length,
      "no slot tiles for same-parent target card",
    ).toBe(0);
  });

  test("shift-cycle on same-parent sibling: dives into target slots and shows chip", async ({
    page,
  }) => {
    const source = card1(page);
    await source.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await source.click();
    await page.waitForTimeout(300);

    const at = await card2Center(page);
    await holdDragAt(page, source, at);

    // First shift tap dives into card2's slots.
    await tapShift(page, at);
    await page.waitForTimeout(200);

    const tileLabels = await getTileLabels(page);
    const chipText = await getCycleChipText(page);
    await page.mouse.up();

    // After shift, tile labels should appear (dived into card2's slots).
    expect(
      tileLabels && tileLabels.length > 0,
      "slot tiles visible after shift-cycle dive",
    ).toBe(true);

    // Cycle chip must show a step counter.
    expect(chipText, "cycle chip text present").not.toBeNull();
    expect(chipText, "cycle chip shows N of M format").toMatch(/\d+ of \d+/);
  });

  test("cycle chip is present at drag entry showing the ⇧ cycle hint", async ({
    page,
  }) => {
    const source = card1(page);
    await source.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await source.click();
    await page.waitForTimeout(300);

    // R12: the chip discloses the cycle key from drag entry, before any Shift
    // step — over any destination, not just after diving into slots.
    const at = await card2Center(page);
    await holdDragAt(page, source, at);
    await page.waitForTimeout(80);

    const chip = await getCycleChipText(page);
    await page.mouse.up();
    expect(chip, "drag entry shows the cycle hint").toBe("⇧ to cycle");
  });

  test("cycle chip disappears after drop", async ({ page }) => {
    const source = card1(page);
    await source.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await source.click();
    await page.waitForTimeout(300);

    const at = await card2Center(page);
    await holdDragAt(page, source, at);
    await tapShift(page, at);
    await page.waitForTimeout(200);

    // Chip present before drop.
    const chipBefore = await getCycleChipText(page);

    await page.mouse.up();
    await page.waitForTimeout(300);

    const chipAfter = await getCycleChipText(page);
    expect(chipBefore, "chip present before drop").not.toBeNull();
    expect(chipAfter, "chip gone after drop").toBeNull();
  });
});
