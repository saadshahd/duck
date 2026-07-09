import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  FIX,
  selectByTestId,
  climbToParent,
  clickToolbarAction,
  toggleSheetDisclosure,
  clickArrayRowAction,
  readArraySlotSummary,
  countSheetSlotOutlines,
  clickArraySlotEditOnCanvas,
  isPropSheetOpen,
  isSlotStopVisible,
  getSlotStopLabelText,
  clickSlotInsertBtn,
  isCatalogPickerVisible,
  clickCatalogPickerItem,
} from "../overlay/testing.js";

/** Ticket 114 slice 5 (B) — an array-item `slot` sub-field is NOT edited in the
 *  sheet. It renders as an honest READ-ONLY summary (its real child count) with
 *  an "Edit on canvas" affordance that closes the sheet and selects the nested
 *  slot region on the canvas. This keeps a single control surface and never
 *  occludes the element being edited. */
test.describe("Array-item slot summary + canvas-jump", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  const sectionAt = (page: Page, i: number): Locator =>
    page.locator('[data-testid="sections"]').locator("[data-section]").nth(i);
  const childTags = (loc: Locator): Promise<string[]> =>
    loc.evaluate((el) => [...el.children].map((c) => c.tagName));

  /** Open the Sections sheet, expand its `items` array, and expand the Nth item
   *  row to reveal its `heading` (scalar) + `content` (slot) sub-fields. */
  const openItem = async (page: Page, i: number) => {
    await selectByTestId(page, FIX.sections.childId);
    await page.waitForTimeout(300);
    await climbToParent(page); // nested child → Sections
    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(400);
    expect(await toggleSheetDisclosure(page, "Items")).toBe(true);
    await page.waitForTimeout(200);
    expect(await clickArrayRowAction(page, i, "toggle")).toBe(true);
    await page.waitForTimeout(200);
  };

  test("a slot sub-field renders a read-only summary, not an editable in-sheet outline", async ({
    page,
  }) => {
    await openItem(page, 0);

    // Honest read-only summary: the count reflects item 0's ACTUAL one child.
    expect(await readArraySlotSummary(page)).toEqual({
      label: "Content",
      count: "1 item",
    });
    // Doctrine: no editable in-sheet slot outline for an array-item slot.
    expect(await countSheetSlotOutlines(page)).toBe(0);
  });

  test("the empty item's summary reports zero, honestly", async ({ page }) => {
    await openItem(page, 1);
    expect(await readArraySlotSummary(page)).toEqual({
      label: "Content",
      count: "0 items",
    });
  });

  test("Edit on canvas closes the sheet and selects the nested slot region", async ({
    page,
  }) => {
    await openItem(page, 0);

    expect(await clickArraySlotEditOnCanvas(page)).toBe(true);
    await page.waitForTimeout(400);

    // The sheet is gone (never occludes the element being edited) and the nested
    // content slot is selected on the canvas, its band named.
    expect(await isPropSheetOpen(page)).toBe(false);
    expect(await isSlotStopVisible(page)).toBe(true);
    expect(await getSlotStopLabelText(page)).toBe("Sections › content");
  });

  test("canvas-jump into the EMPTY item's slot lets the insert land there", async ({
    page,
  }) => {
    await openItem(page, 1);

    const before = (await childTags(sectionAt(page, 1))).length;
    expect(await clickArraySlotEditOnCanvas(page)).toBe(true);
    await page.waitForTimeout(400);
    expect(await isSlotStopVisible(page)).toBe(true);

    await clickSlotInsertBtn(page);
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(true);

    expect(await clickCatalogPickerItem(page, "Text")).toBe(true);
    await page.waitForTimeout(400);

    // The child landed in the previously-empty item 1 slot.
    expect((await childTags(sectionAt(page, 1))).length).toBe(before + 1);
  });
});
