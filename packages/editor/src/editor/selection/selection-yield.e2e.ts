import { test, expect, type Page } from "@playwright/test";
import {
  countSelectionRings,
  isSelectionLabelVisible,
  countBoxModelBands,
  toggleBoxModel,
  isSlotStopVisible,
  countSelectedSlotNamers,
  getSlotStopLabelText,
  enterSlotChoice,
  sourceCenter,
  edgePoint,
  dispatchDrag,
  selectElement,
  settle,
  openTestPage,
} from "../overlay/testing.js";

/**
 * R1 — Selection yields entirely. While drag is not idle (dragging or carrying)
 * the pointer region leaves `selected`, so every piece of selection chrome
 * suppresses: the selection ring, the label cluster (action bar + box-model
 * toggle), and the box-model bands. The drag overlay is the sole mark.
 *
 * R2 (first half) — One selected thing at a time: in `slot-selected` the element
 * ring is gone and exactly one selection border remains — the slot stop band.
 */

const selectNested = (page: Page) =>
  selectElement(page, page.locator("h3").first());

test.describe("Selection yields while dragging", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("mid-drag: ring, label cluster, and box-model bands all suppress", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);

    // Reveal box-model bands so their suppression is observable.
    await toggleBoxModel(page);
    await settle(page);
    expect(await countSelectionRings(page)).toBe(1);
    expect(await isSelectionLabelVisible(page)).toBe(true);
    expect(await countBoxModelBands(page)).toBeGreaterThan(0);

    const description = page.locator("p").first();
    const from = await sourceCenter(heading);
    const to = await edgePoint(description, "bottom");

    await dispatchDrag(page, { from, to, phase: "hold" });

    await expect.poll(() => countSelectionRings(page)).toBe(0);
    expect(await isSelectionLabelVisible(page)).toBe(false);
    expect(await countBoxModelBands(page)).toBe(0);

    // Drop restores selection chrome.
    await dispatchDrag(page, { from, to, phase: "release" });
    await expect.poll(() => countSelectionRings(page)).toBe(1);
    expect(await isSelectionLabelVisible(page)).toBe(true);
  });

  test("mid-carry: ring, label cluster, and box-model bands all suppress", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);

    await toggleBoxModel(page);
    await settle(page);
    expect(await countSelectionRings(page)).toBe(1);
    expect(await countBoxModelBands(page)).toBeGreaterThan(0);

    // Lift into carry via Space — the keyboard lift is carry's entry point.
    await page.keyboard.press("Space");

    await expect.poll(() => countSelectionRings(page)).toBe(0);
    expect(await isSelectionLabelVisible(page)).toBe(false);
    expect(await countBoxModelBands(page)).toBe(0);

    // Cancel restores selection chrome.
    await settle(page);
    await page.keyboard.press("Escape");
    await expect.poll(() => countSelectionRings(page)).toBe(1);
    expect(await isSelectionLabelVisible(page)).toBe(true);
  });
});

test.describe("Slot selection replaces the element ring", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("slot-selected shows exactly one selection border — the slot stop, no element ring", async ({
    page,
  }) => {
    await selectNested(page);
    expect(await countSelectionRings(page)).toBe(1);

    // Enter the insert slot-choice on the Card: the element ring yields to the
    // slot-stop band (slot-selected is reached via insert, not climb).
    await enterSlotChoice(page);

    expect(await isSlotStopVisible(page)).toBe(true);
    expect(await countSelectionRings(page)).toBe(0);
  });
});

/**
 * R12 — at most one element names a selected slot.
 * - resting-selected (element inside a slot): no slot namer paints — the chip's
 *   slot-address line was retired with the selection cluster; no slot-stop band
 *   exists yet.
 * - slot-selected (in the insert flow): the slot-stop label is the sole namer;
 *   the node label cluster yields entirely.
 */
test.describe("One painter for the selected slot name (R12)", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("resting-selected: no slot namer paints", async ({ page }) => {
    await selectNested(page);

    expect(await countSelectedSlotNamers(page)).toBe(0);
    expect(await isSlotStopVisible(page)).toBe(false);
  });

  test("slot-selected: slot-stop label is the only slot namer; node label yields", async ({
    page,
  }) => {
    await selectNested(page);

    await enterSlotChoice(page);

    // The node label cluster yields entirely.
    expect(await isSelectionLabelVisible(page)).toBe(false);

    // Exactly one element names the selected slot — the active slot-stop label.
    expect(await countSelectedSlotNamers(page)).toBe(1);
    expect(await getSlotStopLabelText(page)).toMatch(/.+ › .+/);
  });
});
