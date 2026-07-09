import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  FIX,
  selectByTestId,
  climbToParent,
  clickToolbarAction,
  toggleSheetDisclosure,
  clickArrayRowAction,
  readArraySlotLabel,
  readArraySlotChildren,
  clickArraySlotChild,
  realClickArraySlotChild,
  isArraySlotInsertVisible,
  clickArraySlotInsert,
  countSheetSlotOutlines,
  isPropSheetOpen,
  isCatalogPickerVisible,
  clickCatalogPickerItem,
  getHighlightRect,
  getPageElementBox,
  countSelectionRings,
} from "../overlay/testing.js";

/** Ticket 114 — an array-item `slot` sub-field is NOT edited in the sheet. It
 *  renders an honest READ-ONLY list of the slot's ACTUAL child nodes: clicking a
 *  child closes the sheet and selects THAT child on the canvas (the feedback
 *  loop — the designer sees what they picked). An EMPTY slot shows an insert
 *  affordance that opens the catalog picker for the nested slot. This keeps a
 *  single control surface — the list moves selection, it is never a second
 *  editor, and it never occludes the element being edited. */
test.describe("Array-item slot child list + canvas navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  const sectionAt = (page: Page, i: number): Locator =>
    page.locator('[data-testid="sections"]').locator("[data-section]").nth(i);
  const childTags = (loc: Locator): Promise<string[]> =>
    loc.evaluate((el) => [...el.children].map((c) => c.tagName));
  const closeTo = (a: number, b: number, tolerance = 6) =>
    Math.abs(a - b) <= tolerance;

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

  test("a filled slot lists its children by type — honestly, and never as an in-sheet outline", async ({
    page,
  }) => {
    await openItem(page, 0);

    // Honest: item 0's content slot holds exactly one Text child (the fixture),
    // labelled by its stored `.type` — catalog-agnostic, no hardcoded name.
    expect(await readArraySlotLabel(page)).toBe("Content");
    expect(await readArraySlotChildren(page)).toEqual(["Text"]);
    // Doctrine: an array-item slot never renders an editable in-sheet outline.
    expect(await countSheetSlotOutlines(page)).toBe(0);
  });

  test("clicking a child closes the sheet and rings THAT child on the canvas", async ({
    page,
  }) => {
    await openItem(page, 0);

    expect(await clickArraySlotChild(page, FIX.sections.childId)).toBe(true);
    await page.waitForTimeout(400);

    // The sheet is gone (never occludes the edited element) and the ring hugs
    // the clicked child, not the array holder.
    expect(await isPropSheetOpen(page)).toBe(false);
    expect(await countSelectionRings(page)).toBe(1);

    const childBox = await getPageElementBox(
      page,
      `[data-testid='${FIX.sections.childId}']`,
    );
    const ring = await getHighlightRect(page);
    expect(childBox).not.toBeNull();
    expect(ring).not.toBeNull();
    const childHeight = childBox!.bottom - childBox!.top;
    expect(closeTo(parseFloat(ring!.height), childHeight)).toBe(true);
    expect(closeTo(parseFloat(ring!.top), childBox!.top)).toBe(true);
  });

  test("a REAL-mouse child click rings THAT child, not the root (self-unmount race)", async ({
    page,
  }) => {
    await openItem(page, 0);

    // Trusted click: closing the sheet detaches the row mid-dispatch. Without a
    // stopPropagation guard the bubbled click reaches the document selection
    // handler, which hit-tests the pointer and re-selects the canvas beneath the
    // row — empty or the root — instead of the intended child. A synthetic
    // .click() cannot reproduce this; only page.mouse can.
    expect(await realClickArraySlotChild(page, FIX.sections.childId)).toBe(
      true,
    );
    await page.waitForTimeout(400);

    expect(await isPropSheetOpen(page)).toBe(false);
    expect(await countSelectionRings(page)).toBe(1);

    // The ring hugs the clicked child, NOT the Sections holder and NOT nothing.
    const childBox = await getPageElementBox(
      page,
      `[data-testid='${FIX.sections.childId}']`,
    );
    const ring = await getHighlightRect(page);
    expect(childBox).not.toBeNull();
    expect(ring).not.toBeNull();
    const childHeight = childBox!.bottom - childBox!.top;
    expect(closeTo(parseFloat(ring!.height), childHeight)).toBe(true);
    expect(closeTo(parseFloat(ring!.top), childBox!.top)).toBe(true);
  });

  test("an empty slot shows the insert affordance, not a child list", async ({
    page,
  }) => {
    await openItem(page, 1);

    // Honest: item 1's content slot is empty — no child list, an insert prompt.
    expect(await readArraySlotChildren(page)).toBeNull();
    expect(await isArraySlotInsertVisible(page)).toBe(true);
  });

  test("the empty slot's insert affordance opens the picker and lands a child there", async ({
    page,
  }) => {
    await openItem(page, 1);

    const before = (await childTags(sectionAt(page, 1))).length;
    expect(await clickArraySlotInsert(page)).toBe(true);
    await page.waitForTimeout(400);

    // Sheet closed, catalog picker open for the nested slot.
    expect(await isPropSheetOpen(page)).toBe(false);
    expect(await isCatalogPickerVisible(page)).toBe(true);

    expect(await clickCatalogPickerItem(page, "Text")).toBe(true);
    await page.waitForTimeout(400);

    // The child landed in the previously-empty item 1 slot.
    expect((await childTags(sectionAt(page, 1))).length).toBe(before + 1);
  });
});
