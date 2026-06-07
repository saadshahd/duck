import { test, expect } from "@playwright/test";
import { countSelectionRings } from "../overlay/testing.js";

test.describe("Escape never navigates the browser", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("Escape with a selection deselects and keeps the URL", async ({
    page,
  }) => {
    const url = page.url();
    await page.locator("h1").click();
    await page.waitForTimeout(200);
    expect(await countSelectionRings(page)).toBeGreaterThan(0);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    expect(page.url()).toBe(url);
    expect(await countSelectionRings(page)).toBe(0);
  });

  test("Escape with nothing selected leaves URL unchanged", async ({
    page,
  }) => {
    const url = page.url();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    expect(page.url()).toBe(url);
  });
});
