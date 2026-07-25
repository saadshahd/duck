import { test, expect, type Page } from "@playwright/test";
import {
  readMoveGhost,
  getMoveGhostPosition,
  getActiveDestinationLabel,
  countDestinationText,
  countRetiredDestinationLabels,
  dragStart,
  dragOverAt,
  dragEnd,
  selectElement,
  settle,
  type Point,
  openTestPage,
} from "./testing.js";

const cardTitle = (page: Page) => page.locator('h3:has-text("Zero Chrome")');
const card = (page: Page) => cardTitle(page).locator("..");

/** Point in the gap below the card title — over the Card's header slot band. */
const headerGapPoint = async (page: Page): Promise<Point> => {
  const title = await cardTitle(page).boundingBox();
  const cardBox = await card(page).boundingBox();
  if (!title || !cardBox) throw new Error("Card not visible");
  return { x: cardBox.x + cardBox.width / 2, y: title.y + title.height + 2 };
};

/** Top-left void corner — outside every page element. */
const VOID: Point = { x: 5, y: 5 };

/** Lift the heading into carry via Space (keyboard never auto-scrolls). */
const liftHeading = async (page: Page) => {
  await selectElement(page, page.locator("h1"));
  await page.keyboard.press("Space");
  // Space is a discrete-priority event, so the carry state commit has already
  // flushed; carry arms on a setTimeout(0) (use-carry.ts) which two frames
  // clears, and two frames is also the overlay's rAF anchor pass.
  await settle(page);
};

test.describe("Move ghost — one element, both modalities", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("drag: ghost names source → destination · valid; destination painted exactly once", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);

    await dragStart(page, heading);
    await dragOverAt(page, await headerGapPoint(page));

    const ghost = await readMoveGhost(page);
    expect(ghost).not.toBeNull();
    expect(ghost!.sourceType).toBe("Heading");
    expect(ghost!.valid).toBe(true);
    expect(ghost!.destination).toBe("Card › header");

    // R4: the resolved-destination datum is painted exactly once (the ghost) and
    // no retired label element resurrects it. The tiles name candidate slots —
    // a different datum — so they are not counted here.
    expect(await countDestinationText(page, "Card › header")).toBe(1);
    expect(await countRetiredDestinationLabels(page)).toBe(0);

    await dragEnd(page, await headerGapPoint(page));
  });

  test("drag: ghost follows the pointer — two positions yield two ghost positions", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);

    const gap = await headerGapPoint(page);
    const lower: Point = { x: gap.x, y: gap.y + 60 };

    await dragStart(page, heading);
    await dragOverAt(page, gap);
    const first = await getMoveGhostPosition(page);

    await dragOverAt(page, lower);
    const second = await getMoveGhostPosition(page);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second!.y).toBeGreaterThan(first!.y);

    await dragEnd(page, lower);
  });

  test("drag: over a void area the ghost shows the blocked state", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);

    await dragStart(page, heading);
    await dragOverAt(page, VOID);

    const ghost = await readMoveGhost(page);
    expect(ghost).not.toBeNull();
    expect(ghost!.sourceType).toBe("Heading");
    expect(ghost!.valid).toBe(false);
    expect(ghost!.destination).toBeNull();

    await dragEnd(page, VOID);
  });

  test("carry: ghost names source → destination · valid; destination painted exactly once", async ({
    page,
  }) => {
    await liftHeading(page);

    const gap = await headerGapPoint(page);
    await page.mouse.move(gap.x, gap.y);
    await expect
      .poll(() => getActiveDestinationLabel(page))
      .toBe("Card › header");

    const ghost = await readMoveGhost(page);
    expect(ghost!.sourceType).toBe("Heading");
    expect(ghost!.valid).toBe(true);
    expect(ghost!.destination).toBe("Card › header");

    expect(await countDestinationText(page, "Card › header")).toBe(1);
    expect(await countRetiredDestinationLabels(page)).toBe(0);

    await page.keyboard.press("Escape");
  });

  test("carry: ghost follows the pointer — two positions yield two ghost positions", async ({
    page,
  }) => {
    await liftHeading(page);

    const gap = await headerGapPoint(page);
    await page.mouse.move(gap.x, gap.y);
    await expect.poll(() => getMoveGhostPosition(page)).not.toBeNull();
    const first = await getMoveGhostPosition(page);

    await page.mouse.move(gap.x, gap.y + 60);
    // The ghost is positioned straight from React state (move-ghost.tsx reads
    // `point`), so a mousemove's continuous-priority commit plus one paint is
    // all that stands between the move and a readable position.
    await settle(page);
    const second = await getMoveGhostPosition(page);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second!.y).toBeGreaterThan(first!.y);

    await page.keyboard.press("Escape");
  });

  test("carry: over a void area the ghost shows the blocked state", async ({
    page,
  }) => {
    await liftHeading(page);

    await page.mouse.move(VOID.x, VOID.y);
    await expect
      .poll(() => readMoveGhost(page).then((g) => g?.valid))
      .toBe(false);

    const ghost = await readMoveGhost(page);
    expect(ghost!.sourceType).toBe("Heading");
    expect(ghost!.valid).toBe(false);
    expect(ghost!.destination).toBeNull();

    await page.keyboard.press("Escape");
  });
});
