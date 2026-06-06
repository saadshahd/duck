import { test, expect, type Page } from "@playwright/test";
import {
  countSelectionRings,
  isSelectionLabelVisible,
  countBoxModelBands,
  toggleBoxModel,
  isMoveChipVisible,
  getSlotAddressText,
  isSlotStopVisible,
  clickMoveChip,
  selectParentElement,
  sourceCenter,
  edgePoint,
  dispatchDrag,
} from "../overlay/testing.js";

/**
 * R1 — Selection yields entirely. While drag is not idle (dragging or carrying)
 * the pointer region leaves `selected`, so every piece of selection chrome
 * suppresses: the selection ring, the label cluster (slot address, Move chip,
 * box-model toggle), and the box-model bands. The drag overlay is the sole mark.
 *
 * R2 (first half) — One selected thing at a time: in `slot-selected` the element
 * ring is gone and exactly one selection border remains — the slot stop band.
 */

const selectNested = async (page: Page) => {
  await page.locator("h3").first().click();
  await page.waitForTimeout(300);
};

test.describe("Selection yields while dragging", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("mid-drag: ring, label cluster, and box-model bands all suppress", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    // Reveal box-model bands so their suppression is observable.
    await toggleBoxModel(page);
    await page.waitForTimeout(150);
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
    expect(await isMoveChipVisible(page)).toBe(false);
    expect(await getSlotAddressText(page)).toBeNull();

    // Drop restores selection chrome.
    await dispatchDrag(page, { from, to, phase: "release" });
    await expect.poll(() => countSelectionRings(page)).toBe(1);
    expect(await isSelectionLabelVisible(page)).toBe(true);
  });

  test("mid-carry: ring, label cluster, and box-model bands all suppress", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await toggleBoxModel(page);
    await page.waitForTimeout(150);
    expect(await countSelectionRings(page)).toBe(1);
    expect(await countBoxModelBands(page)).toBeGreaterThan(0);

    await clickMoveChip(page);
    await page.waitForTimeout(150);

    await expect.poll(() => countSelectionRings(page)).toBe(0);
    expect(await isSelectionLabelVisible(page)).toBe(false);
    expect(await countBoxModelBands(page)).toBe(0);
    expect(await isMoveChipVisible(page)).toBe(false);

    // Cancel restores selection chrome.
    await page.keyboard.press("Escape");
    await expect.poll(() => countSelectionRings(page)).toBe(1);
    expect(await isSelectionLabelVisible(page)).toBe(true);
  });
});

test.describe("Slot selection replaces the element ring", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("slot-selected shows exactly one selection border — the slot stop, no element ring", async ({
    page,
  }) => {
    await selectNested(page);
    expect(await countSelectionRings(page)).toBe(1);

    // Climb one step: element ring yields to the slot stop band.
    await selectParentElement(page);
    await page.waitForTimeout(300);

    expect(await isSlotStopVisible(page)).toBe(true);
    expect(await countSelectionRings(page)).toBe(0);
  });
});
