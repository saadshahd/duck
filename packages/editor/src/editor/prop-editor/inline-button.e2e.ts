import { test, expect } from "@playwright/test";
import { openTestPage, selectElement, settle } from "../overlay/testing.js";

/** Get cursor offset within a contentEditable element. */
const cursorOffset = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.getSelection()?.getRangeAt(0).startOffset ?? -1);

/** Locate the single contentEditable element on the page. */
const editableElement = (page: import("@playwright/test").Page) =>
  page.locator("[contenteditable='true']");

test.describe("Inline editing on button elements", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("space inserts at cursor and advances position", async ({ page }) => {
    const button = page.locator("button", { hasText: "Get started" }).first();

    await selectElement(page, button);
    await button.dblclick();

    // Inline edit's observable: the element becomes contentEditable. settle()
    // after, so the first keystroke doesn't land mid-commit.
    const active = editableElement(page);
    await active.waitFor();
    await settle(page);
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

    await selectElement(page, button);
    await button.dblclick();
    await editableElement(page).waitFor();
    await settle(page);

    // Space must leave editing untouched — there is no post-state to poll for
    // (a passing poll would be vacuous), so settle covers the render.
    await page.keyboard.press("Space");
    await settle(page);

    expect(await editableElement(page).count()).toBe(1);
  });
});
