import { test, expect, type Page } from "@playwright/test";
import {
  readOverlayElements,
  enterSlotChoice,
  sourceCenter,
  edgePoint,
  dispatchDrag,
  clickToolbarAction,
  isSheetVisible,
openTestPage,
} from "../overlay/testing.js";

/** R4 observer: one assertion per interaction state pinning its complete,
 *  non-overlapping affordance census. Reaching a state must show exactly the
 *  affordances that state owns and nothing else. */

test.describe("R4 — state-owned affordance sets", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("resting-selected owns rings + label cluster + action bar; no slot stop, no drop overlay, no lift pulse", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);

    expect(await readOverlayElements(page)).toEqual({
      selectionRings: 1,
      labelCluster: true,
      boxModelToggle: true,
      actionBar: true,
      slotStop: false,
      slotInsert: false,
      dropIndicator: false,
      liftPulse: false,
    });
  });

  test("editing owns the ring only — the panel supersedes the handle (no action bar, no label cluster, no box-model)", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);

    await clickToolbarAction(page, "edit");
    await expect.poll(() => isSheetVisible(page)).toBe(true);

    expect(await readOverlayElements(page)).toEqual({
      selectionRings: 1,
      labelCluster: false,
      boxModelToggle: false,
      actionBar: false,
      slotStop: false,
      slotInsert: false,
      dropIndicator: false,
      liftPulse: false,
    });

    // Closing the panel restores the handle (browse intent).
    await page.keyboard.press("Escape");
    await expect
      .poll(async () => (await readOverlayElements(page))?.actionBar)
      .toBe(true);
  });

  test("slot-selected owns the slot stop only; node label cluster yields (R12), no rings, no box-model, no action bar, no drop overlay", async ({
    page,
  }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    // Slot-selected is reached via the insert slot-choice on the Card. R12: the
    // node label cluster yields entirely so the slot-stop label is the sole
    // slot namer.
    await enterSlotChoice(page);
    await expect
      .poll(() => readOverlayElements(page))
      .toEqual({
        selectionRings: 0,
        labelCluster: false,
        boxModelToggle: false,
        actionBar: false,
        slotStop: true,
        slotInsert: true,
        dropIndicator: false,
        liftPulse: false,
      });
  });

  test("dragging owns the drop overlay only; no resting-selection affordances, no lift pulse", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    const description = page.locator("p").first();
    const from = await sourceCenter(heading);
    const to = await edgePoint(description, "bottom");

    await dispatchDrag(page, { from, to, phase: "hold" });
    await expect
      .poll(async () => (await readOverlayElements(page))?.dropIndicator)
      .toBe(true);

    expect(await readOverlayElements(page)).toEqual({
      selectionRings: 0,
      labelCluster: false,
      boxModelToggle: false,
      actionBar: false,
      slotStop: false,
      slotInsert: false,
      dropIndicator: true,
      liftPulse: false,
    });

    await dispatchDrag(page, { from, to, phase: "release" });
  });

  test("carrying owns the drop overlay + lift pulse; no resting-selection affordances, no slot stop", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    // Lift into carry via Space — the keyboard lift is carry's entry point.
    await page.keyboard.press("Space");
    await page.waitForTimeout(150);

    await expect
      .poll(() => readOverlayElements(page))
      .toEqual({
        selectionRings: 0,
        labelCluster: false,
        boxModelToggle: false,
        actionBar: false,
        slotStop: false,
        slotInsert: false,
        dropIndicator: true,
        liftPulse: true,
      });

    await page.keyboard.press("Escape");
  });
});
