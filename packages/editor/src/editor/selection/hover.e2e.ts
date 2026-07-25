import { test, expect } from "@playwright/test";
import {
  countHighlights,
  selectElement,
  settle,
  openTestPage,
} from "../overlay/testing.js";

test.describe("Hover ring", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("hover shows a ring; leaving leaves the page chrome-free", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    const box = await heading.boundingBox();
    expect(box).not.toBeNull();

    // Hover over the element.
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect.poll(() => countHighlights(page)).toBeGreaterThan(0);

    // Move the pointer to a far empty corner → no hover chrome.
    await page.mouse.move(2, 2);
    await expect.poll(() => countHighlights(page)).toBe(0);
  });

  test("no hover ring on the already-selected element", async ({ page }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);
    const box = await heading.boundingBox();

    // Hover the selected element — only the selection ring should remain (1),
    // no additional hover ring. Nothing new may appear, so there is no state to
    // poll for: a poll for "still 1" would pass before the hover was processed.
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await settle(page);
    expect(await countHighlights(page)).toBe(1);
  });
});
