import { test, expect } from "@playwright/test";
import { countHighlights, countToolbarButtons } from "../overlay/testing.js";

test.describe("Inline text editing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("double-click text makes it editable", async ({ page }) => {
    const heading = page.locator("h1");

    // Select first
    await heading.click();
    await page.waitForTimeout(300);

    // Double-click to enter inline edit
    await heading.dblclick();
    await page.waitForTimeout(300);

    const contentEditable = await heading.getAttribute("contenteditable");
    expect(contentEditable).toBe("true");
  });

  test("Enter commits inline edit", async ({ page }) => {
    const heading = page.locator("h1");
    const originalText = await heading.textContent();

    await heading.click();
    await page.waitForTimeout(300);
    await heading.dblclick();
    await page.waitForTimeout(300);

    // Type new text (selectAll + type replaces content)
    await page.keyboard.press("Meta+a");
    await page.keyboard.type("Updated Heading");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    const newText = await heading.textContent();
    expect(newText).toBe("Updated Heading");
    expect(newText).not.toBe(originalText);

    // Should exit editing mode — contentEditable removed
    const contentEditable = await heading.getAttribute("contenteditable");
    expect(contentEditable).not.toBe("true");
  });

  test("Escape reverts inline edit", async ({ page }) => {
    const heading = page.locator("h1");
    const originalText = await heading.textContent();

    await heading.click();
    await page.waitForTimeout(300);
    await heading.dblclick();
    await page.waitForTimeout(300);

    // Type something
    await page.keyboard.press("Meta+a");
    await page.keyboard.type("Should be reverted");

    // Escape should revert
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    const text = await heading.textContent();
    expect(text).toBe(originalText);
  });

  test("editing blocks drag (states are exclusive)", async ({ page }) => {
    const heading = page.locator("h1");

    await heading.click();
    await page.waitForTimeout(300);
    await heading.dblclick();
    await page.waitForTimeout(300);

    // During editing, element should not be draggable
    const draggable = await heading.getAttribute("draggable");
    expect(draggable).not.toBe("true");
  });
});

test.describe("Popover editing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("edit button opens prop popover", async ({ page }) => {
    const heading = page.getByText("Zero Chrome", { exact: true });
    await heading.click();
    await page.waitForTimeout(300);
    expect(await countToolbarButtons(page)).toBe(5);

    // Edit button is index 3 (✏) in the action bar
    const { clickToolbarButton } = await import("../overlay/testing.js");
    await clickToolbarButton(page, 3);
    await page.waitForTimeout(300);

    // Action bar replaced by popover — toolbar buttons gone
    expect(await countToolbarButtons(page)).toBe(0);
  });
});
