import { test, expect } from "@playwright/test";
import { countHighlights } from "../overlay/testing.js";

test.describe("Hover ring", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  test("hover shows a ring; leaving leaves the page chrome-free", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    const box = await heading.boundingBox();
    expect(box).not.toBeNull();

    // Hover over the element.
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(200);
    expect(await countHighlights(page)).toBeGreaterThan(0);

    // Move the pointer to a far empty corner → no hover chrome.
    await page.mouse.move(2, 2);
    await page.waitForTimeout(200);
    expect(await countHighlights(page)).toBe(0);
  });

  test("no hover ring on the already-selected element", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(200);
    const box = await heading.boundingBox();

    // Hover the selected element — only the selection ring should remain (1),
    // no additional hover ring.
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(200);
    expect(await countHighlights(page)).toBe(1);
  });
});
