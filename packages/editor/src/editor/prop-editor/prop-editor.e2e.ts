import { test, expect } from "@playwright/test";
import {
  hasToolbarAction,
  clickToolbarAction,
  readSegmentedItems,
  isSwatchSentinelVisible,
  isDimensionSentinelVisible,
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

test.describe("Sheet editing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("edit button opens prop sheet", async ({ page }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);
    expect(await hasToolbarAction(page, "edit")).toBe(true);

    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(400);

    const visible = await page.evaluate(() => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        return d.shadowRoot.querySelector("[data-role='prop-sheet']") !== null;
      }
      return false;
    });
    expect(visible).toBe(true);
  });

  test("unset controls show honest unset state, not a default value", async ({
    page,
  }) => {
    // "Zero Chrome" is an h3 whose `style` object is empty in the sample data.
    // After T3, its nested style fields use specialised controls (segmented,
    // swatch, dimension) instead of native <select>. Each must reflect the stored
    // absence honestly: no item checked, sentinel visible, or empty input.
    // After T8, the style section is always-open (FieldSection, not Disclosure),
    // so no expand step is needed.
    await page.getByText("Zero Chrome").click();
    await page.waitForTimeout(300);
    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(300);

    // textAlign is segmented (left/center/right/justify). Unset → no item checked.
    const textAlignItems = await readSegmentedItems(page, "Text align");
    expect(textAlignItems).not.toBeNull();
    const checkedTextAlign = textAlignItems!.filter((i) => i.checked);
    expect(checkedTextAlign.length).toBe(0);

    // color is a swatch control. Unset → sentinel chip visible.
    expect(await isSwatchSentinelVisible(page)).toBe(true);

    // fontSize is a dimension control. Unset → sentinel visible.
    expect(await isDimensionSentinelVisible(page, "Font size")).toBe(true);

    // marginBottom is a dimension control. Unset → sentinel visible.
    expect(await isDimensionSentinelVisible(page, "Margin bottom")).toBe(true);
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
            "[data-role='prop-sheet'] input, [data-role='prop-sheet'] textarea",
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
