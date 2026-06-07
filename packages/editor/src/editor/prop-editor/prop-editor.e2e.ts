import { test, expect } from "@playwright/test";
import {
  isToolbarVisible,
  hasToolbarAction,
  clickToolbarAction,
} from "../overlay/testing.js";

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
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);
    expect(await hasToolbarAction(page, "edit")).toBe(true);

    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(300);

    expect(await isToolbarVisible(page)).toBe(false);
  });

  test("unset select shows blank placeholder, not the first option", async ({
    page,
  }) => {
    // "Zero Chrome" is an h3 whose `style` object is empty in the sample data,
    // so its nested style selects (fontSize/textAlign/color/...) are all unset —
    // an honest select must render them blank, never silently as option[0].
    await page.getByText("Zero Chrome").click();
    await page.waitForTimeout(300);
    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(300);

    const values = await page.evaluate(() => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const selects = d.shadowRoot.querySelectorAll(
          "[data-role='prop-popover'] select",
        );
        if (!selects.length) return "NO_SELECTS";
        // First select is `level` (set to "h3"); the rest back the empty style object.
        return [...selects].slice(1).map((s) => (s as HTMLSelectElement).value);
      }
      return "NO_ROOT";
    });

    expect(Array.isArray(values) && values.length).toBeTruthy();
    expect(values).toEqual((values as string[]).map(() => ""));
  });

  test("read-only resolved field is non-editable after async resolve", async ({
    page,
  }) => {
    await page.locator("p").first().click();
    await page.waitForTimeout(300);
    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(1500); // resolveData delay (~1s) + margin

    const readOnly = await page.evaluate(() => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const fields = [
          ...d.shadowRoot.querySelectorAll(
            "[data-role='prop-popover'] input, [data-role='prop-popover'] textarea",
          ),
        ] as (HTMLInputElement | HTMLTextAreaElement)[];
        const resolved = fields.find((f) => f.readOnly);
        return resolved ? resolved.readOnly : false;
      }
      return false;
    });

    expect(readOnly).toBe(true);
  });
});
