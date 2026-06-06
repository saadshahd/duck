import { test, expect, type Page } from "@playwright/test";
import {
  countHighlights,
  getTileLabels,
  getActiveDestinationLabel,
  isToolbarVisible,
  sourceCenter,
  isMoveChipVisible,
  getMoveChipText,
  clickMoveChip,
  isLiftPulseVisible,
  isNoTargetFlashVisible,
  type Point,
} from "../overlay/testing.js";

const cardTitle = (page: Page) => page.locator('h3:has-text("Zero Chrome")');
const card = (page: Page) => cardTitle(page).locator("..");

/** Point in the gap below the card title — over the Card's header slot band. */
const headerGapPoint = async (page: Page): Promise<Point> => {
  const title = await cardTitle(page).boundingBox();
  const cardBox = await card(page).boundingBox();
  if (!title || !cardBox) throw new Error("Card not visible");
  return { x: cardBox.x + cardBox.width / 2, y: title.y + title.height + 2 };
};

const cardTags = (page: Page) =>
  card(page).evaluate((el) => [...el.children].map((c) => c.tagName));

const lift = async (page: Page) => {
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
};

test.describe("Carry (pointer-driven move)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("toolbar Move lifts; clicking a slot band moves the element into it", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);
    expect(await isToolbarVisible(page)).toBe(true);

    await clickMoveChip(page);
    await page.waitForTimeout(150);

    const gap = await headerGapPoint(page);
    await page.mouse.move(gap.x, gap.y);
    await expect
      .poll(async () => (await getTileLabels(page))?.[0] ?? null)
      .toBe("Card › header");

    await page.mouse.click(gap.x, gap.y);

    await expect
      .poll(async () => (await cardTags(page)).slice(0, 2))
      .toEqual(["H3", "H1"]);
  });

  test("Space lift, arrow step, Enter commits", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await lift(page);

    const gap = await headerGapPoint(page);
    await page.mouse.move(gap.x, gap.y);
    await expect
      .poll(() => getActiveDestinationLabel(page))
      .toBe("Card › header");

    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(80);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(120);
    expect(await getActiveDestinationLabel(page)).toBe("Card › body");

    await page.keyboard.press("Enter");

    await expect.poll(() => cardTags(page)).toContain("H1");
  });

  test("Esc cancels: element unmoved and still selected", async ({ page }) => {
    const heading = page.locator("h1");
    const heroSection = heading.locator("..");
    const before = await heroSection.locator("> *").first().textContent();

    await heading.click();
    await page.waitForTimeout(300);
    expect(await countHighlights(page)).toBe(1);

    await clickMoveChip(page);
    await page.waitForTimeout(150);

    const gap = await headerGapPoint(page);
    await page.mouse.move(gap.x, gap.y);
    await page.waitForTimeout(120);

    await page.keyboard.press("Escape");

    await expect
      .poll(() => heroSection.locator("> *").first().textContent())
      .toBe(before);
    expect(await countHighlights(page)).toBe(1);
  });
});

test.describe("Carry affordances", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("move chip is visible with correct text when element is selected", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    expect(await isMoveChipVisible(page)).toBe(true);
    expect(await getMoveChipText(page)).toBe("⤢ Move");
  });

  test("action-move button no longer exists in the toolbar", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);
    expect(await isToolbarVisible(page)).toBe(true);

    const hasOldButton = await page.evaluate(() => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        return (
          d.shadowRoot.querySelector(
            "[role='toolbar'] [data-role='action-move']",
          ) !== null
        );
      }
      return false;
    });
    expect(hasOldButton).toBe(false);
  });

  test("click move chip enters carrying mode: slot tiles visible and body cursor is move", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await clickMoveChip(page);
    await page.waitForTimeout(150);

    // Slot tiles appear when carrying
    await expect.poll(() => getTileLabels(page)).not.toBeNull();
    const tiles = await getTileLabels(page);
    expect(tiles && tiles.length > 0).toBe(true);

    // Body cursor is move
    const cursor = await page.evaluate(() => document.body.style.cursor);
    expect(cursor).toBe("move");
  });

  test("lift pulse appears when carrying starts", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await clickMoveChip(page);
    await page.waitForTimeout(50);

    expect(await isLiftPulseVisible(page)).toBe(true);
  });

  test("clicking void area while carrying shows no-target flash then clears; still carrying", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await clickMoveChip(page);
    await page.waitForTimeout(150);

    // Move pointer to a void area (top-left corner — outside all page elements).
    // Wait for the rAF to fire and settle selected=null before clicking.
    await page.mouse.move(5, 5);
    await page.waitForTimeout(200);

    // Click — should trigger no-target flash (no valid destination at corner)
    await page.mouse.click(5, 5);

    // Flash should appear
    await expect.poll(() => isNoTargetFlashVisible(page)).toBe(true);

    // Flash should disappear after ~300ms
    await expect
      .poll(() => isNoTargetFlashVisible(page), { timeout: 1000 })
      .toBe(false);

    // Still carrying: cursor is still "move" and move chip is gone (carrying hides
    // selection label) — confirmed by the cursor signal which is the clearest carry indicator.
    const cursor = await page.evaluate(() => document.body.style.cursor);
    expect(cursor).toBe("move");
  });

  test("Esc cancels carry: cursor restored", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await clickMoveChip(page);
    await page.waitForTimeout(150);

    expect(await page.evaluate(() => document.body.style.cursor)).toBe("move");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    const cursor = await page.evaluate(() => document.body.style.cursor);
    expect(cursor).not.toBe("move");
    expect(await countHighlights(page)).toBe(1);
  });

  test("Space on selected element lifts (regression: Task 2)", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await lift(page);

    // Carrying: slot tiles should be visible
    await expect.poll(() => getTileLabels(page)).not.toBeNull();
    const tiles = await getTileLabels(page);
    expect(tiles && tiles.length > 0).toBe(true);

    // Cancel to restore
    await page.keyboard.press("Escape");
  });
});
