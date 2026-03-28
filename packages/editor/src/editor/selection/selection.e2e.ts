import { test, expect } from "@playwright/test";
import {
  countHighlights,
  getHighlightRect,
  countToolbarButtons,
  clickToolbarButton,
} from "../overlay/testing.js";

// --- Tests ---

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

  test("click shows floating action bar with 5 buttons", async ({ page }) => {
    await page.getByText("Zero Chrome", { exact: true }).click();
    await page.waitForTimeout(300);

    expect(await countToolbarButtons(page)).toBe(5);
    expect(await countHighlights(page)).toBe(1);
  });

  test("click empty space deselects", async ({ page }) => {
    await page.getByText("Zero Chrome", { exact: true }).click();
    await page.waitForTimeout(300);

    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);

    expect(await countToolbarButtons(page)).toBe(0);
    expect(await countHighlights(page)).toBe(0);
  });

  test("action bar clicks preserve selection", async ({ page }) => {
    await page.getByText("Zero Chrome", { exact: true }).click();
    await page.waitForTimeout(300);
    expect(await countToolbarButtons(page)).toBe(5);

    await clickToolbarButton(page);
    await page.waitForTimeout(300);
    expect(await countToolbarButtons(page)).toBe(5);
  });

  test("hover different elements moves highlight", async ({ page }) => {
    await page.locator("h1").hover();
    await page.waitForTimeout(300);
    const rectA = await getHighlightRect(page);

    await page.getByText("Features", { exact: true }).hover();
    await page.waitForTimeout(300);
    const rectB = await getHighlightRect(page);

    expect(rectA).not.toBeNull();
    expect(rectB).not.toBeNull();
    expect(rectA).not.toEqual(rectB);
  });

  test("hover while selected does not change selection", async ({ page }) => {
    await page.getByText("Zero Chrome", { exact: true }).click();
    await page.waitForTimeout(300);
    expect(await countToolbarButtons(page)).toBe(5);

    await page.locator("h1").hover();
    await page.waitForTimeout(300);

    // selection ring persists, toolbar stays
    expect(await countToolbarButtons(page)).toBe(5);
    expect(await countHighlights(page)).toBe(1);
  });

  test("selecting different element changes selection", async ({ page }) => {
    await page.getByText("Zero Chrome", { exact: true }).click();
    await page.waitForTimeout(300);
    const rectA = await getHighlightRect(page);

    await page.locator("h1").click();
    await page.waitForTimeout(300);
    const rectB = await getHighlightRect(page);

    expect(await countToolbarButtons(page)).toBe(5);
    expect(rectA).not.toBeNull();
    expect(rectB).not.toBeNull();
    expect(rectA).not.toEqual(rectB);
  });

  test("scroll updates selection rect", async ({ page }) => {
    await page.getByText("Zero Chrome", { exact: true }).click();
    await page.waitForTimeout(300);
    const rectBefore = await getHighlightRect(page);

    await page.evaluate(() => window.scrollBy(0, 100));
    await page.waitForTimeout(300);
    const rectAfter = await getHighlightRect(page);

    expect(rectBefore).not.toBeNull();
    expect(rectAfter).not.toBeNull();
    expect(rectBefore!.top).not.toBe(rectAfter!.top);
  });
});
