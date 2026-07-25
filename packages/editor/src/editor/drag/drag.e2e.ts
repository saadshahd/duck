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
  selectElement,
  settle,
  sourceCenter,
  draggablePressPoint,
  edgePoint,
  type Point,
  openTestPage,
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
    await openTestPage(page);
  });

  test("selected element gets draggable attribute", async ({ page }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);
    await expect(heading).toHaveAttribute("draggable", "true");
  });

  test("drag over sibling shows drop indicator", async ({ page }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);

    const description = page.locator("p").first();
    await dragOver(page, heading, description);

    await expect.poll(() => hasDropIndicator(page)).toBe(true);
  });

  test("drop reorders elements", async ({ page }) => {
    // Get initial text order in the hero section
    const heading = page.locator("h1");
    const heroSection = heading.locator("..");
    const initialFirst = await heroSection.locator("> *").first().textContent();

    // Select heading
    await selectElement(page, heading);

    // Drag heading to below the description (second sibling)
    const description = page.locator("p").first();
    await dragAndDrop(page, heading, description, "bottom");

    // After reorder, heading should no longer be the first child. The commit
    // runs inside a view transition (animatedUpdate), so the DOM change lands a
    // frame or two after the drop dispatch returns — poll rather than sleep.
    await expect
      .poll(() => heroSection.locator("> *").first().textContent())
      .not.toBe(initialFirst);
  });

  test("cannot drag while editing", async ({ page }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);

    // Double-click to enter inline edit
    await heading.dblclick();

    // Element should not be draggable during edit — a real transition, since
    // selection above set draggable="true".
    await expect(heading).not.toHaveAttribute("draggable", "true");
  });

  test("second drag works after first drop", async ({ page }) => {
    const heading = page.locator("h1");
    const heroSection = heading.locator("..");
    const initialFirst = await heroSection.locator("> *").first().textContent();
    await selectElement(page, heading);

    const description = page.locator("p").first();
    await dragAndDrop(page, heading, description, "bottom");

    // Wait for the reorder to actually land before selecting again — the point
    // of the test is re-selection AFTER a drop, so clicking mid-commit would
    // exercise something else.
    await expect
      .poll(() => heroSection.locator("> *").first().textContent())
      .not.toBe(initialFirst);
    await selectElement(page, description);

    // The draggable affordance lands on the selected component's registered root
    // element, which wraps the inner <p>. Re-selection after a drop must
    // re-attach it — proving a second drag can begin.
    const descriptionRoot = description.locator("..");
    await expect(descriptionRoot).toHaveAttribute("draggable", "true");

    // Drag back. Nothing is asserted afterwards; settle just lets the dispatched
    // drop flush before teardown.
    const movedHeading = page.locator("h1");
    await dragAndDrop(page, description, movedHeading, "top");
    await settle(page);
  });
});

// --- Slot-aware container drops ---

/** Real-mouse drag: press on a hit-verified point of the source (selection
 *  chrome can cover a small source's center — see draggablePressPoint), glide
 *  through waypoints with multiple steps so Chromium starts a native HTML5 drag
 *  (pragmatic-dnd's adapter), and optionally release at the final point. */
async function mouseDrag(
  page: Page,
  source: Locator,
  waypoints: readonly Point[],
  release: boolean,
) {
  const start = await draggablePressPoint(source);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const wp of waypoints) {
    await page.mouse.move(wp.x, wp.y, { steps: 8 });
    await settle(page);
  }
  if (release) await page.mouse.up();
}

test.describe("Slot-aware container drops", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
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
    await selectElement(page, heading);

    await dragOverPoint(page, heading, await headerGapPoint(page));

    await expect.poll(() => getActiveTileLabel(page)).toBe("Card › header");
  });

  test("container hover paints gapless labeled tiles", async ({ page }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);

    await mouseDrag(page, heading, [await headerGapPoint(page)], false);

    await expect
      .poll(() => getTileLabels(page))
      .toEqual(["Card › header", "Card › body", "Card › footer"]);

    await page.mouse.up();
  });

  test("tile label is visible before release", async ({ page }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);

    await mouseDrag(page, heading, [await headerGapPoint(page)], false);

    await expect.poll(() => getActiveTileLabel(page)).toBe("Card › header");
    const rect = await getActiveTileRect(page);
    expect(rect).not.toBeNull();

    await page.mouse.up();
  });

  test("drop into a slot via its tile band inserts at the pointer position", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);

    await dragAndDropPoint(page, heading, await headerGapPoint(page));

    await expect
      .poll(async () =>
        (
          await card(page).evaluate((el) =>
            [...el.children].map((c) => c.tagName),
          )
        ).slice(0, 2),
      )
      .toEqual(["H3", "H1"]);
  });

  test("move an element between slots of the same container", async ({
    page,
  }) => {
    const title = cardTitle(page);
    await selectElement(page, title);

    const desc = page.locator('p:has-text("No panels, no toolbars")');
    await dragAndDrop(page, title, desc, "bottom");

    // The moved H3 lands after the body Text; the trailing DIV is the card's
    // `tags` decoration (feature-1 carries a "Design" tag for the array-field
    // suite), which renders after the body slot and before the empty footer.
    await expect
      .poll(() =>
        card(page).evaluate((el) => [...el.children].map((c) => c.tagName)),
      )
      .toEqual(["DIV", "H3", "DIV"]);
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
  // The cycle chip mounts in onDragStart (use-drag-reorder sets the "entry"
  // CycleStatus there), so its presence is exactly "the native drag session is
  // live and the overlay has painted" — what the fixed sleep stood in for. It
  // says nothing about a resolved destination; callers that need one poll for it.
  await expect
    .poll(() => getCycleChipText(page), { intervals: [25] })
    .not.toBeNull();
}

/** Tap Shift once during a live native drag. Chromium emits no dragover for a
 *  modifier-only change without pointer motion, so a 1px nudge follows BOTH
 *  key-down (rising edge → step) and key-up (falling edge → re-arm the next
 *  rising edge). Without the key-up nudge shiftKey stays latched true and no
 *  further step ever fires. */
async function tapShift(page: Page, at: Point) {
  const before = await getCycleChipText(page);
  await page.keyboard.down("Shift");
  await page.mouse.move(at.x + 1, at.y, { steps: 1 });
  // The chip re-reads "N of M" on every step, so its text CHANGING is the step
  // landing — the observable the fixed sleep was guessing at.
  await expect
    .poll(() => getCycleChipText(page), { intervals: [25] })
    .not.toBe(before);
  await page.keyboard.up("Shift");
  await page.mouse.move(at.x, at.y, { steps: 1 });
  // Falling edge re-arms the next rising edge; settle before the next input.
  await settle(page);
}

test.describe("Shift-cycle destination stack", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  const cardTitle = (page: Page) => page.locator('h3:has-text("Zero Chrome")');
  const card = (page: Page) => cardTitle(page).locator("..");

  const cardCenter = (page: Page): Promise<Point> => sourceCenter(card(page));

  test("shift tap steps the active destination; repeated taps wrap", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);

    const at = await cardCenter(page);
    await holdDragAt(page, heading, at);

    // First tap steps onto the deepest container's first slot.
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
    // Target the undecorated card: its empty footer's carved band sits directly
    // below the body (the last rendered slot child), so the bottom band is
    // pointer-reachable. The "Zero Chrome" card carries a `tags` decoration
    // (an unregistered trailing element), which pushes the footer band into a
    // region the pointer path cannot resolve — that card reaches its footer via
    // the shift-cycle stack instead (covered above).
    const targetCard = page
      .locator('h3:has-text("Catalog-Agnostic")')
      .locator("..");
    const heading = page.locator("h1");
    await selectElement(page, heading);

    const box = await targetCard.boundingBox();
    if (!box) throw new Error("Card not visible");
    const footerBand: Point = {
      x: box.x + box.width / 2,
      y: box.y + box.height - 10,
    };

    await mouseDrag(page, heading, [footerBand], true);

    // H1 lands as the card's last child (the footer slot's only element). The
    // commit runs behind a view transition, so poll for the new child order.
    await expect
      .poll(async () =>
        (
          await targetCard.evaluate((el) =>
            [...el.children].map((c) => c.tagName),
          )
        ).at(-1),
      )
      .toBe("H1");
  });

  test("cycle to beside-in-parent and drop lands the element as a sibling", async ({
    page,
  }) => {
    const grid = card(page).locator("..");
    const before = await grid.evaluate((el) => el.children.length);

    const heading = page.locator("h1");
    await selectElement(page, heading);

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

    expect(landed).toBe(true);
    await expect
      .poll(() => grid.evaluate((el) => el.children.length))
      .toBe(before + 1);
  });
});

// --- Ghost names the line destination (folded zone label + position chip) ---

test.describe("Move ghost on a between-siblings line drag", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("ghost names source → qualified slot destination · valid; no retired label survives", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);

    const description = page.locator("p").first();
    await dragOver(page, heading, description);

    // A line drop still paints the spatial indicator (where), and the single ghost
    // names the resolution (what + validity). The zone label, position chip, and
    // root label are folded into the ghost — none survives.
    await expect.poll(() => hasDropIndicator(page)).toBe(true);

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
    await openTestPage(page);
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
    // Nothing scrolls smoothly here, so the scroll is already done — settle just
    // lets the overlay re-anchor before the click.
    await settle(page);
    await selectElement(page, source);

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
    // Wait for the panel's band set to paint at all; how many of those are
    // CARVED is what the assertion below decides.
    await expect
      .poll(async () => (await readTiles(page))?.length ?? 0, {
        intervals: [50],
      })
      .toBeGreaterThan(0);

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
    // Nothing scrolls smoothly here, so the scroll is already done — settle just
    // lets the overlay re-anchor before the click.
    await settle(page);
    await selectElement(page, source);

    const panelBox = await scatterPanel(page).boundingBox();
    if (!panelBox) throw new Error("Scatter panel not visible");
    const center: Point = {
      x: panelBox.x + panelBox.width / 2,
      y: panelBox.y + panelBox.height / 2,
    };

    await mouseDrag(page, source, [center], false);
    // Wait for the panel's tiles to paint at all; whether they are DISCRETE and
    // how the leader count matches is what the assertions below decide.
    await expect
      .poll(async () => (await readTiles(page))?.length ?? 0, {
        intervals: [50],
      })
      .toBeGreaterThan(0);

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
    await openTestPage(page);
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
    // Nothing scrolls smoothly here, so the scroll is already done — settle just
    // lets the overlay re-anchor before the click.
    await settle(page);
    await selectElement(page, source);

    const at = await card2Center(page);
    await holdDragAt(page, source, at);
    // holdDragAt only proves the drag session is live (the entry chip mounts in
    // onDragStart); the resolution against card2 lands on the first dragover.
    await expect.poll(() => hasDropIndicator(page)).toBe(true);

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
    // Nothing scrolls smoothly here, so the scroll is already done — settle just
    // lets the overlay re-anchor before the click.
    await settle(page);
    await selectElement(page, source);

    const at = await card2Center(page);
    await holdDragAt(page, source, at);

    // First shift tap dives into card2's slots. tapShift returns once the chip
    // has stepped, and the dive's tiles paint in that same commit.
    await tapShift(page, at);

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
    // Nothing scrolls smoothly here, so the scroll is already done — settle just
    // lets the overlay re-anchor before the click.
    await settle(page);
    await selectElement(page, source);

    // R12: the chip discloses the cycle key from drag entry, before any Shift
    // step — over any destination, not just after diving into slots.
    const at = await card2Center(page);
    await holdDragAt(page, source, at);

    const chip = await getCycleChipText(page);
    await page.mouse.up();
    expect(chip, "drag entry shows the cycle hint").toBe("⇧ to cycle");
  });

  test("cycle chip disappears after drop", async ({ page }) => {
    const source = card1(page);
    await source.scrollIntoViewIfNeeded();
    // Nothing scrolls smoothly here, so the scroll is already done — settle just
    // lets the overlay re-anchor before the click.
    await settle(page);
    await selectElement(page, source);

    const at = await card2Center(page);
    await holdDragAt(page, source, at);
    await tapShift(page, at);

    // Chip present before drop.
    const chipBefore = await getCycleChipText(page);

    await page.mouse.up();
    // onDrop clears the cycle status, unmounting the chip — a real transition
    // from the non-null reading just taken, so this poll cannot pass vacuously.
    await expect.poll(() => getCycleChipText(page)).toBeNull();

    const chipAfter = await getCycleChipText(page);
    expect(chipBefore, "chip present before drop").not.toBeNull();
    expect(chipAfter, "chip gone after drop").toBeNull();
  });
});
