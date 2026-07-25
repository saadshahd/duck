import { test, expect } from "@playwright/test";
import {
  countSelectionRings,
  selectElement,
  settle,
  openTestPage,
} from "../overlay/testing.js";

test.describe("Escape never navigates the browser", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("Escape with a selection deselects and keeps the URL", async ({
    page,
  }) => {
    const url = page.url();
    await selectElement(page, page.locator("h1"));
    expect(await countSelectionRings(page)).toBeGreaterThan(0);

    await page.keyboard.press("Escape");

    // Ring count 1 → 0 is a real transition, so polling for it is not vacuous.
    await expect.poll(() => countSelectionRings(page)).toBe(0);
    expect(page.url()).toBe(url);
  });

  test("Escape with nothing selected leaves URL unchanged", async ({
    page,
  }) => {
    const url = page.url();
    await page.keyboard.press("Escape");
    // "The URL did not change" has no post-state to poll for — a poll would pass
    // instantly whether or not a navigation was about to commit. Two frames give
    // the browser its chance to act on the key before we read.
    await settle(page);
    expect(page.url()).toBe(url);
  });
});
