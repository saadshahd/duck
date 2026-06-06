import { test, expect, type Page } from "@playwright/test";
import {
  clickToolbarAction,
  countHighlights,
  getTileLabels,
  getActiveDestinationLabel,
  isToolbarVisible,
  sourceCenter,
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

    await clickToolbarAction(page, "move");
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

    await clickToolbarAction(page, "move");
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
