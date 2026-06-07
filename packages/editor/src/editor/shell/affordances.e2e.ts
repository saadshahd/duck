import { test, expect, type Page } from "@playwright/test";
import {
  readOverlayElements,
  selectParentElement,
  clickMoveChip,
  sourceCenter,
  edgePoint,
  dispatchDrag,
} from "../overlay/testing.js";

/** R4 observer: one assertion per interaction state pinning its complete,
 *  non-overlapping affordance census. Reaching a state must show exactly the
 *  affordances that state owns and nothing else. */

test.describe("R4 — state-owned affordance sets", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("resting-selected owns rings + label cluster (move + box-model) + action bar; no slot stop, no drop overlay, no lift pulse", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);

    expect(await readOverlayElements(page)).toEqual({
      selectionRings: 1,
      labelCluster: true,
      moveChip: true,
      boxModelToggle: true,
      actionBar: true,
      slotStop: false,
      slotInsert: false,
      dropIndicator: false,
      liftPulse: false,
    });
  });

  test("slot-selected owns label cluster + slot stop; no rings, no move chip, no box-model, no action bar, no drop overlay", async ({
    page,
  }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    // First ↑ on the chip climbs to the owning slot stop.
    await selectParentElement(page);
    await expect
      .poll(() => readOverlayElements(page))
      .toEqual({
        selectionRings: 0,
        labelCluster: true,
        moveChip: false,
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
      moveChip: false,
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

    await clickMoveChip(page);
    await page.waitForTimeout(150);

    await expect
      .poll(() => readOverlayElements(page))
      .toEqual({
        selectionRings: 0,
        labelCluster: false,
        moveChip: false,
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
