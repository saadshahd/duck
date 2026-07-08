import { test, expect } from "@playwright/test";
import {
  enterSlotChoice,
  clickSlotInsertBtn,
  clickFirstCatalogPickerItem,
  isSlotInsertBtnVisible,
  isCatalogPickerVisible,
  isSlotStopVisible,
  getSlotStopLabelText,
  openIncompatiblePickerSection,
  getIncompatiblePickerItemState,
  clickIncompatiblePickerItem,
  pageContentCensus,
} from "../overlay/testing.js";

/** T4 observer: slot-selected state owns an inline insert (+) inside the band.
 *  Clicking it opens the catalog picker targeting that slot. The slot-choice
 *  step is reached via the insert flow on a multi-slot node — climb navigates
 *  nodes only and never enters slot-selected. */

test.describe("Slot-selected inline insert", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  test("slot-stop band shows inline insert (+) button when slot is selected", async ({
    page,
  }) => {
    // Select a nested element (h3 lives in a slot inside a Card), then enter the
    // insert slot-choice on its Card (slot-selected).
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    await enterSlotChoice(page);

    expect(await isSlotStopVisible(page)).toBe(true);
    expect(await isSlotInsertBtnVisible(page)).toBe(true);
  });

  test("clicking (+) inside the slot band opens the catalog picker", async ({
    page,
  }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    await enterSlotChoice(page);

    expect(await isSlotInsertBtnVisible(page)).toBe(true);
    expect(await isCatalogPickerVisible(page)).toBe(false);

    await clickSlotInsertBtn(page);
    await page.waitForTimeout(300);

    expect(await isCatalogPickerVisible(page)).toBe(true);
  });

  test("catalog picker opened from slot (+) inserts into that slot", async ({
    page,
  }) => {
    // Click the first h3 (lives in a Card header slot) and enter the Card's
    // insert slot-choice (slot-selected). The Card's slots render as direct
    // children of the card div (BareSlot is a Fragment) in header/body/footer
    // order, so the header slot occupies the leading child positions.
    const card = page.locator("h3").first().locator("..");
    const cardTags = () =>
      card.evaluate((el) => [...el.children].map((c) => c.tagName));

    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    await enterSlotChoice(page);

    // The active slot-stop label names the targeted slot — the Card header.
    expect(await getSlotStopLabelText(page)).toMatch(/› header$/);
    const tagsBefore = await cardTags();

    await clickSlotInsertBtn(page);
    await page.waitForTimeout(300);

    expect(await isCatalogPickerVisible(page)).toBe(true);

    // Click the first picker item via the named helper (data-role query, not CSS class).
    await clickFirstCatalogPickerItem(page);
    await page.waitForTimeout(300);

    // Picker closes after insert.
    expect(await isCatalogPickerVisible(page)).toBe(false);

    // Insertion landed in the header slot, not elsewhere: exactly one new child,
    // added among the leading (header) positions — the body's former children
    // are all pushed down by one and otherwise unchanged.
    const tagsAfter = await cardTags();
    expect(tagsAfter.length).toBe(tagsBefore.length + 1);
    expect(tagsAfter.slice(2)).toEqual(tagsBefore.slice(1));
  });

  test("slot-choice picker names the slot in the disabled reason; clicking writes nothing", async ({
    page,
  }) => {
    // The honest affordance on the slot-choice route: an incompatible item is
    // disabled up front (never a click-then-reject), and its reason names the
    // targeted slot — not the generic "this slot".
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    await enterSlotChoice(page);
    await clickSlotInsertBtn(page);
    await page.waitForTimeout(300);

    expect(await isCatalogPickerVisible(page)).toBe(true);
    await openIncompatiblePickerSection(page);

    expect(await getIncompatiblePickerItemState(page, "Button")).toEqual({
      disabled: true,
      title: "Not allowed in Card › header",
    });

    // Clicking it anyway must not write: document unchanged, picker still open.
    const censusBefore = await pageContentCensus(page);
    await clickIncompatiblePickerItem(page, "Button");
    await page.waitForTimeout(300);

    expect(await pageContentCensus(page)).toEqual(censusBefore);
    expect(await isCatalogPickerVisible(page)).toBe(true);
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

    await enterSlotChoice(page);

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
