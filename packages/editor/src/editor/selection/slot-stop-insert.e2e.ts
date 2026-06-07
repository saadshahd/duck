import { test, expect } from "@playwright/test";
import {
  selectParentElement,
  clickSlotInsertBtn,
  clickFirstCatalogPickerItem,
  isSlotInsertBtnVisible,
  isCatalogPickerVisible,
  isSlotStopVisible,
  getSlotAddressText,
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
    // Click the first h3 (lives in a Card header slot) and climb to slot-selected.
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    await selectParentElement(page);
    await page.waitForTimeout(300);

    // Capture the slot address label before inserting so we can verify targeting.
    const slotAddressBefore = await getSlotAddressText(page);
    expect(slotAddressBefore).toBeTruthy();

    await clickSlotInsertBtn(page);
    await page.waitForTimeout(300);

    expect(await isCatalogPickerVisible(page)).toBe(true);

    // Click the first picker item via the named helper (data-role query, not CSS class).
    await clickFirstCatalogPickerItem(page);
    await page.waitForTimeout(300);

    // Picker closes after insert.
    expect(await isCatalogPickerVisible(page)).toBe(false);

    // The new element is now selected; its slot address must match the slot we
    // targeted — confirming insertion landed in the correct slot, not elsewhere.
    const slotAddressAfter = await getSlotAddressText(page);
    expect(slotAddressAfter).toBe(slotAddressBefore);
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
