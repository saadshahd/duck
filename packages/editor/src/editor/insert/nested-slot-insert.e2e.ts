import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  FIX,
  selectByTestId,
  enterSlotChoice,
  getSlotStopLabelText,
  clickSlotInsertBtn,
  isCatalogPickerVisible,
  openIncompatiblePickerSection,
  getIncompatiblePickerItemState,
  clickCatalogPickerItem,
  readSlotStopLabels,
openTestPage,
} from "../overlay/testing.js";

/** Ticket 114 slice 5 (A) — insert INTO an array-item slot via the selection /
 *  insert path. Selecting the nested child and opening insert (`/`) climbs to
 *  the array holder (Sections) and enters the slot-choice step over its
 *  array-item content slots (`items[i].content`), addressed by prop-path. The
 *  first (filled) slot is active; the (+) writes into it, and the picker honors
 *  the nested `disallow` (Card is rejected in `items[i].content`). */
test.describe("Insert into an array-item slot", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  const sectionAt = (page: Page, i: number): Locator =>
    page.locator('[data-testid="sections"]').locator("[data-section]").nth(i);
  const childTags = (loc: Locator): Promise<string[]> =>
    loc.evaluate((el) => [...el.children].map((c) => c.tagName));

  test("both array-item content slots are offered as named bands in slot-choice", async ({
    page,
  }) => {
    await selectByTestId(page, FIX.sections.childId);
    await page.waitForTimeout(300);

    await enterSlotChoice(page);

    // Two items → two `Sections › content` slots, both named on screen (the law
    // that no insert writes to an unnamed slot). The empty slot is offered too.
    const labels = await readSlotStopLabels(page);
    expect(labels.filter((l) => l === "Sections › content").length).toBe(2);
  });

  test("inserting an allowed type lands the child in the filled item's slot", async ({
    page,
  }) => {
    await selectByTestId(page, FIX.sections.childId);
    await page.waitForTimeout(300);

    await enterSlotChoice(page);
    expect(await getSlotStopLabelText(page)).toMatch(/› content$/);

    const before = (await childTags(sectionAt(page, 0))).length;

    await clickSlotInsertBtn(page);
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(true);

    expect(await clickCatalogPickerItem(page, "Text")).toBe(true);
    await page.waitForTimeout(400);

    expect(await isCatalogPickerVisible(page)).toBe(false);
    // The new child landed in item 0's content slot (not item 1's, not a sibling
    // of the Sections holder).
    expect((await childTags(sectionAt(page, 0))).length).toBe(before + 1);
  });

  test("nested disallow is enforced: Card is rejected in items[i].content", async ({
    page,
  }) => {
    await selectByTestId(page, FIX.sections.childId);
    await page.waitForTimeout(300);

    await enterSlotChoice(page);
    await clickSlotInsertBtn(page);
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(true);

    await openIncompatiblePickerSection(page);
    // `content` declares `disallow: ["Card"]` on the nested array-item slot —
    // the path-walked constraint disables Card up front (never click-then-reject).
    expect(await getIncompatiblePickerItemState(page, "Card")).toEqual({
      disabled: true,
      title: "Not allowed in Sections › content",
    });
  });
});
