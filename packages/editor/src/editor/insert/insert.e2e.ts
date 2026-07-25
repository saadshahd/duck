import { test, expect } from "@playwright/test";
import {
  climbToParent,
  enterSlotChoice,
  clickSlotInsertBtn,
  isCatalogPickerVisible,
  isSlotStopVisible,
  clickFirstCatalogPickerItem,
  clickToolbarAction,
  getCatalogPickerRect,
  readSlotBands,
  readSlotStopLabels,
  countSelectionRings,
  pageContentCensus,
  getPageElementBox,
  bandPaddingPoint,
  pickerOwnsCenterPoint,
  selectElement,
  settle,
  openTestPage,
} from "../overlay/testing.js";

/** R11: insert never writes without a named slot on screen. A multi-slot node's
 *  insert leads to a slot-choice step (every slot band painted and named); the
 *  picker, when opened, anchors over the chosen slot band. */

type Box = { top: number; left: number; bottom: number; right: number };

/** Intersection with a margin equal to the picker's anchor offset: the picker
 *  sits `offset(8)` below the band, so it touches/overlaps the band once that
 *  gap is accounted for. Proves anchoring to the slot band — not floating at the
 *  parent element, the old behavior. */
const MARGIN = 10;
const overlapsWithMargin = (picker: Box, band: Box): boolean =>
  picker.left < band.right + MARGIN &&
  picker.right > band.left - MARGIN &&
  picker.top < band.bottom + MARGIN &&
  picker.bottom > band.top - MARGIN;

test.describe("Insert routing — explicit slot, no silent default", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("/ on a multi-slot node enters the slot-choice step: every slot named, nothing written", async ({
    page,
  }) => {
    // Select a Heading inside a Card, climb to the Card element (resting-selected).
    await selectElement(page, page.locator("h3").first());
    await climbToParent(page);

    // Capture the document's shape before the action: a direct no-write observer.
    const censusBefore = await pageContentCensus(page);

    // Press / on the multi-slot Card.
    await page.keyboard.press("/");

    // Slot-choice step: bands painted and named, no picker auto-opened, no write.
    await expect.poll(() => isSlotStopVisible(page)).toBe(true);
    expect(await isCatalogPickerVisible(page)).toBe(false);
    const labels = await readSlotStopLabels(page);
    expect(labels.length).toBeGreaterThanOrEqual(2);
    expect(labels.every((l) => l.includes("›"))).toBe(true);
    // No element got selected — slot-choice paints no selection ring, so no write.
    expect(await countSelectionRings(page)).toBe(0);
    // And the rendered document is byte-for-byte unchanged: nothing was written.
    expect(await pageContentCensus(page)).toBe(censusBefore);
  });

  test("action-bar (+) on a multi-slot node enters the slot-choice step, no write", async ({
    page,
  }) => {
    await selectElement(page, page.locator("h3").first());
    await climbToParent(page);

    await clickToolbarAction(page, "insert");

    await expect.poll(() => isSlotStopVisible(page)).toBe(true);
    expect(await isCatalogPickerVisible(page)).toBe(false);
    expect(await countSelectionRings(page)).toBe(0);
    const labels = await readSlotStopLabels(page);
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });

  test("/ in slot-selected opens the picker anchored over the chosen slot band", async ({
    page,
  }) => {
    // Reach slot-selected via the insert flow on the multi-slot Card, then press
    // / again: in slot-selected a slot is already chosen, so / opens the picker
    // for it — it never re-routes or resets the choice (R11). The band's (+)
    // opens the same picker.
    await selectElement(page, page.locator("h3").first());
    await enterSlotChoice(page);
    expect(await isSlotStopVisible(page)).toBe(true);
    await settle(page);

    await page.keyboard.press("/");

    await expect.poll(() => isCatalogPickerVisible(page)).toBe(true);
    // The picker is anchored by floating-ui; give its first positioning pass a
    // frame to paint before reading geometry.
    await settle(page);

    const pickerRect = await getCatalogPickerRect(page);
    expect(pickerRect).not.toBeNull();
    const bands = await readSlotBands(page);
    const active = bands.find((b) => b.active);
    expect(active).toBeTruthy();
    expect(overlapsWithMargin(pickerRect!, active!)).toBe(true);
  });

  test("/ in slot-selected opens the picker for the RETARGETED slot, never resetting to the first slot", async ({
    page,
  }) => {
    // The reset-bug pin: enter slot-choice (header active by default), retarget
    // to a non-first slot via a band click, then press /. The picker must anchor
    // to the RETARGETED slot — / must not re-route back to the first slot.
    await selectElement(page, page.locator("h3").first());
    await enterSlotChoice(page);
    await settle(page);

    const bands = await readSlotBands(page);
    expect(bands.length).toBeGreaterThanOrEqual(2);

    // Choose a non-first (inactive) band — the second slot down.
    const inactive = bands.find((b) => !b.active);
    expect(inactive).toBeTruthy();
    await page.mouse.click(
      (inactive!.left + inactive!.right) / 2,
      (inactive!.top + inactive!.bottom) / 2,
    );
    // A retarget leaves the band COUNT unchanged, so there is no count to poll —
    // the active flag moves within the same set.
    await settle(page);

    const retargeted = (await readSlotBands(page)).find((b) => b.active)!;
    expect(Math.abs(retargeted.top - inactive!.top)).toBeLessThan(4);

    // Press / — the picker opens anchored to the RETARGETED slot, not the first.
    await page.keyboard.press("/");
    await expect.poll(() => isCatalogPickerVisible(page)).toBe(true);
    await settle(page);

    const pickerRect = await getCatalogPickerRect(page);
    expect(pickerRect).not.toBeNull();
    expect(overlapsWithMargin(pickerRect!, retargeted)).toBe(true);
    // And the active slot is still the retargeted one — / did not reset it.
    const stillActive = (await readSlotBands(page)).find((b) => b.active)!;
    expect(Math.abs(stillActive.top - retargeted.top)).toBeLessThan(4);
  });

  test("the open picker is the topmost surface — its center hit-tests into the picker, not the slot band beneath it", async ({
    page,
  }) => {
    // A short viewport forces the picker to overlap the slot bands (no room to
    // flip clear of them), the exact geometry where the stacking bug surfaces.
    await page.setViewportSize({ width: 1280, height: 500 });
    await openTestPage(page);

    await selectElement(page, page.locator("h3").first());
    await enterSlotChoice(page);
    expect(await isSlotStopVisible(page)).toBe(true);
    await settle(page);

    await page.keyboard.press("/");
    await expect.poll(() => isCatalogPickerVisible(page)).toBe(true);
    await settle(page);

    expect(await pickerOwnsCenterPoint(page)).toBe(true);
  });

  test("choosing a different slot band retargets, then insert lands in the chosen slot", async ({
    page,
  }) => {
    await selectElement(page, page.locator("h3").first());
    await enterSlotChoice(page);
    await settle(page);

    const bands = await readSlotBands(page);
    expect(bands.length).toBeGreaterThanOrEqual(2);

    // Click an inactive band's center to re-choose it.
    const inactive = bands.find((b) => !b.active);
    expect(inactive).toBeTruthy();
    await page.mouse.click(
      (inactive!.left + inactive!.right) / 2,
      (inactive!.top + inactive!.bottom) / 2,
    );
    await settle(page);

    const after = await readSlotBands(page);
    const activeBox = after.find((b) => b.active)!;
    // The newly active band is the one we clicked (same vertical position).
    expect(Math.abs(activeBox.top - inactive!.top)).toBeLessThan(4);

    // Open the picker and insert — the new element becomes selected (a write).
    expect(await countSelectionRings(page)).toBe(0);
    await clickSlotInsertBtn(page);
    await expect.poll(() => isCatalogPickerVisible(page)).toBe(true);
    await settle(page);
    await clickFirstCatalogPickerItem(page);
    await expect.poll(() => isCatalogPickerVisible(page)).toBe(false);
    await expect.poll(() => countSelectionRings(page)).toBe(1);
  });

  test("Escape exits the slot-choice/picker flow cleanly", async ({ page }) => {
    await selectElement(page, page.locator("h3").first());
    await enterSlotChoice(page);
    await settle(page);

    // Open the picker with /, then Escape — picker closes, slot-stop survives.
    await page.keyboard.press("/");
    await expect.poll(() => isCatalogPickerVisible(page)).toBe(true);
    await settle(page);

    await page.keyboard.press("Escape");
    await expect.poll(() => isCatalogPickerVisible(page)).toBe(false);
    expect(await isSlotStopVisible(page)).toBe(true);
    await settle(page);

    // Escape again — leaves the slot-choice step entirely, no picker, no stuck state.
    await page.keyboard.press("Escape");
    await expect.poll(() => isSlotStopVisible(page)).toBe(false);
    expect(await isCatalogPickerVisible(page)).toBe(false);
  });

  test("active slot band: clicking the child selects the child, clicking padding keeps the slot", async ({
    page,
  }) => {
    // Enter the insert slot-choice on the Card: the header slot (one child) is
    // active. (Climb no longer reaches slot-selected; insert does.)
    await selectElement(page, page.locator("h3").first());
    await enterSlotChoice(page);
    expect(await isSlotStopVisible(page)).toBe(true);
    expect(await countSelectionRings(page)).toBe(0);
    await settle(page);

    const active = (await readSlotBands(page)).find((b) => b.active)!;
    const child = (await getPageElementBox(page, "h3"))!;

    // A click in the band's padding (not over the child) keeps the slot selected:
    // no element gets a selection ring, the bands stay painted.
    const padding = bandPaddingPoint(active, child)!;
    expect(padding).toBeTruthy();
    await page.mouse.click(padding.x, padding.y);
    // Nothing must appear here, so there is no post-state to poll for — a poll
    // for "still 0 rings" would pass instantly whether or not the click landed.
    await settle(page);
    expect(await countSelectionRings(page)).toBe(0);
    expect(await isSlotStopVisible(page)).toBe(true);

    // A click landing on the child selects the child: a ring appears, bands clear.
    await page.mouse.click(
      (child.left + child.right) / 2,
      (child.top + child.bottom) / 2,
    );
    await expect.poll(() => countSelectionRings(page)).toBe(1);
    expect(await isSlotStopVisible(page)).toBe(false);
  });

  test("single-slot node: one action opens the picker with the slot named (no extra choice step)", async ({
    page,
  }) => {
    // Select a Stack (exactly one slot: children), then climb to the Stack element.
    await selectElement(page, page.locator("h1").first());
    await climbToParent(page);

    const censusBefore = await pageContentCensus(page);

    // ONE action on the single-slot node lands straight in the picker — the slot
    // is named on screen, no separate slot-choice step to confirm.
    await page.keyboard.press("/");
    await expect.poll(() => isCatalogPickerVisible(page)).toBe(true);
    const labels = await readSlotStopLabels(page);
    expect(labels.length).toBe(1);
    // Nothing written yet — the picker open is not a mutation.
    expect(await pageContentCensus(page)).toBe(censusBefore);
    await settle(page);

    // Escape exits cleanly to the selected element (the user never chose a slot),
    // not back into a stuck slot-choice step.
    await page.keyboard.press("Escape");
    await expect.poll(() => isCatalogPickerVisible(page)).toBe(false);
    expect(await isSlotStopVisible(page)).toBe(false);
    expect(await countSelectionRings(page)).toBe(1);
  });
});
