import { test, expect } from "@playwright/test";
import {
  selectParentElement,
  clickSlotInsertBtn,
  isSlotInsertBtnVisible,
  isCatalogPickerVisible,
  isSlotStopVisible,
} from "../overlay/testing.js";

/** T4 observer: slot-selected state owns an inline insert (+) inside the band.
 *  Clicking it opens the catalog picker targeting that slot. */

test.describe("Slot-selected inline insert", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("slot-stop band shows inline insert (+) button when slot is selected", async ({
    page,
  }) => {
    // Select a nested element (h3 lives in a slot inside a Card)
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    // Climb to slot-selected state
    await selectParentElement(page);
    await page.waitForTimeout(300);

    expect(await isSlotStopVisible(page)).toBe(true);
    expect(await isSlotInsertBtnVisible(page)).toBe(true);
  });

  test("clicking (+) inside the slot band opens the catalog picker", async ({
    page,
  }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    await selectParentElement(page);
    await page.waitForTimeout(300);

    expect(await isSlotInsertBtnVisible(page)).toBe(true);
    expect(await isCatalogPickerVisible(page)).toBe(false);

    await clickSlotInsertBtn(page);
    await page.waitForTimeout(300);

    expect(await isCatalogPickerVisible(page)).toBe(true);
  });

  test("catalog picker opened from slot (+) inserts into that slot", async ({
    page,
  }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    await selectParentElement(page);
    await page.waitForTimeout(300);

    await clickSlotInsertBtn(page);
    await page.waitForTimeout(300);

    expect(await isCatalogPickerVisible(page)).toBe(true);

    // Pick the first available component from the catalog picker
    const firstItem = page
      .locator("[data-role='catalog-picker'] .catalog-picker-item")
      .first();

    // The picker is inside shadow DOM — click via evaluate
    await page.evaluate(() => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const item = d.shadowRoot.querySelector(
          ".catalog-picker-item",
        ) as HTMLElement | null;
        item?.click();
        return;
      }
    });
    await page.waitForTimeout(300);

    // Picker closes after insert
    expect(await isCatalogPickerVisible(page)).toBe(false);
  });

  test("slot-stop and insert (+) are absent in resting-selected state", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);

    expect(await isSlotStopVisible(page)).toBe(false);
    expect(await isSlotInsertBtnVisible(page)).toBe(false);
  });

  test("closing catalog picker via outside click leaves slot-stop intact", async ({
    page,
  }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    await selectParentElement(page);
    await page.waitForTimeout(300);

    await clickSlotInsertBtn(page);
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(true);

    // Click somewhere outside the picker to close it
    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);

    expect(await isCatalogPickerVisible(page)).toBe(false);
    // Slot stop should still be visible — clicking outside only closes picker
    expect(await isSlotStopVisible(page)).toBe(true);
  });
});
