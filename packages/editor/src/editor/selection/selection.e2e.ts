import { test, expect } from "@playwright/test";
import {
  countHighlights,
  getHighlightRect,
  waitFrames,
  isToolbarVisible,
  clickToolbar,
} from "../overlay/testing.js";

test.describe("Editor overlay", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("hover shows highlight, mouse away clears it", async ({ page }) => {
    await page.locator("h1").hover();
    await page.waitForTimeout(300);
    expect(await countHighlights(page)).toBe(1);

    await page.mouse.move(10, 10);
    await page.waitForTimeout(300);
    expect(await countHighlights(page)).toBe(0);
  });

  test("click shows floating action bar", async ({ page }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    expect(await isToolbarVisible(page)).toBe(true);
    expect(await countHighlights(page)).toBe(1);
  });

  test("click empty space deselects", async ({ page }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);

    expect(await isToolbarVisible(page)).toBe(false);
    expect(await countHighlights(page)).toBe(0);
  });

  test("action bar clicks preserve selection", async ({ page }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);
    expect(await isToolbarVisible(page)).toBe(true);

    await clickToolbar(page);
    await page.waitForTimeout(300);
    expect(await isToolbarVisible(page)).toBe(true);
  });

  test("hover different elements moves highlight", async ({ page }) => {
    await page.locator("h1").hover();
    await page.waitForTimeout(300);
    const rectA = await getHighlightRect(page);

    await page.locator("h2").first().hover();
    await page.waitForTimeout(300);
    const rectB = await getHighlightRect(page);

    expect(rectA).not.toBeNull();
    expect(rectB).not.toBeNull();
    expect(rectA).not.toEqual(rectB);
  });

  test("hover while selected does not change selection", async ({ page }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);
    expect(await isToolbarVisible(page)).toBe(true);

    await page.locator("h1").hover();
    await page.waitForTimeout(300);

    expect(await isToolbarVisible(page)).toBe(true);
    expect(await countHighlights(page)).toBe(1);
  });

  test("selecting different element changes selection", async ({ page }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);
    const rectA = await getHighlightRect(page);

    await page.locator("h1").click();
    await page.waitForTimeout(300);
    const rectB = await getHighlightRect(page);

    expect(await isToolbarVisible(page)).toBe(true);
    expect(rectA).not.toBeNull();
    expect(rectB).not.toBeNull();
    expect(rectA).not.toEqual(rectB);
  });

  test("scroll updates selection rect", async ({ page }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);
    const rectBefore = await getHighlightRect(page);

    await page.evaluate(() => window.scrollBy(0, 100));
    await page.waitForTimeout(300);
    const rectAfter = await getHighlightRect(page);

    expect(rectBefore).not.toBeNull();
    expect(rectAfter).not.toBeNull();
    expect(rectBefore!.top).not.toBe(rectAfter!.top);
  });

  test("overlay tracks element within one frame after scroll", async ({
    page,
  }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    const rectBefore = await getHighlightRect(page);
    expect(rectBefore).not.toBeNull();
    const topBefore = parseFloat(rectBefore!.top);

    const scrollDelta = 100;
    await page.evaluate((dy) => window.scrollBy(0, dy), scrollDelta);
    await waitFrames(page, 2);

    const rectAfter = await getHighlightRect(page);
    expect(rectAfter).not.toBeNull();
    const topAfter = parseFloat(rectAfter!.top);

    const actualDelta = topBefore - topAfter;
    expect(Math.abs(actualDelta - scrollDelta)).toBeLessThan(5);
  });
});
