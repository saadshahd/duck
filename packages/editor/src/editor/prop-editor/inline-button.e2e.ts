import { test, expect } from "@playwright/test";

/** Get cursor offset within a contentEditable element. */
const cursorOffset = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.getSelection()?.getRangeAt(0).startOffset ?? -1);

/** Locate the single contentEditable element on the page. */
const editableElement = (page: import("@playwright/test").Page) =>
  page.locator("[contenteditable='true']");

test.describe("Inline editing on button elements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("space inserts at cursor and advances position", async ({ page }) => {
    const button = page.locator("button", { hasText: "Get started" }).first();

    await button.click();
    await page.waitForTimeout(300);
    await button.dblclick();
    await page.waitForTimeout(300);

    const active = editableElement(page);
    expect(await active.getAttribute("contenteditable")).toBe("true");

    // Replace content, press space separately, then continue typing
    await page.keyboard.press("Meta+a");
    await page.keyboard.type("AB");
    await page.keyboard.press("Space");

    // Cursor should be at offset 3 (after "AB ")
    expect(await cursorOffset(page)).toBe(3);

    await page.keyboard.type("CD");
    expect(await active.textContent()).toBe("AB CD");
  });

  test("editing stays active after space on button", async ({ page }) => {
    const button = page.locator("button", { hasText: "Get started" }).first();

    await button.click();
    await page.waitForTimeout(300);
    await button.dblclick();
    await page.waitForTimeout(300);

    await page.keyboard.press("Space");
    await page.waitForTimeout(100);

    expect(await editableElement(page).count()).toBe(1);
  });
});
