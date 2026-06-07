import { test, expect, type Page } from "@playwright/test";
import {
  countSelectionRings,
  isSelectionLabelVisible,
  countBoxModelBands,
  toggleBoxModel,
  isMoveChipVisible,
  getSlotAddressText,
  isSlotStopVisible,
  countSelectedSlotNamers,
  getSlotStopLabelText,
  clickMoveChip,
  enterSlotChoice,
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

    // Enter the insert slot-choice on the Card: the element ring yields to the
    // slot-stop band (slot-selected is reached via insert, not climb).
    await enterSlotChoice(page);

    expect(await isSlotStopVisible(page)).toBe(true);
    expect(await countSelectionRings(page)).toBe(0);
  });
});

/**
 * R12 — exactly one element names a selected slot.
 * - resting-selected (element inside a slot): the chip's slot address is the
 *   sole namer; no slot-stop band exists yet.
 * - slot-selected (in the insert flow): the slot-stop label is the sole namer;
 *   the node label cluster (element type + slot address) yields entirely.
 */
test.describe("One painter for the selected slot name (R12)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("resting-selected: chip slot address is the only slot namer", async ({
    page,
  }) => {
    await selectNested(page);

    expect(await countSelectedSlotNamers(page)).toBe(1);
    expect(await getSlotAddressText(page)).toMatch(/^in .+ › .+$/);
    expect(await isSlotStopVisible(page)).toBe(false);
  });

  test("slot-selected: slot-stop label is the only slot namer; node label yields", async ({
    page,
  }) => {
    await selectNested(page);

    await enterSlotChoice(page);

    // The node label cluster (and its slot address) yields entirely.
    expect(await isSelectionLabelVisible(page)).toBe(false);
    expect(await getSlotAddressText(page)).toBeNull();

    // Exactly one element names the selected slot — the active slot-stop label.
    expect(await countSelectedSlotNamers(page)).toBe(1);
    expect(await getSlotStopLabelText(page)).toMatch(/.+ › .+/);
  });
});
