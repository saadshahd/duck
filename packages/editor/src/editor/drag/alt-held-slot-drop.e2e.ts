import { test, expect, type Page } from "@playwright/test";
import {
  dispatchDragAltHeld,
  dispatchDragAltViaVoid,
  sourceCenter,
  edgePoint,
} from "../overlay/testing.js";

/**
 * Repro: holding Alt to override a slot-type block, then releasing onto a
 * slot-constrained drop zone, shows the "allowed" indicator but never commits.
 *
 * The cause is an empty `location.current.dropTargets` at the native `drop`.
 * pragmatic-dnd resets its tracked drop targets to `[]` on `dragleave`, which a
 * real OS drag fires as its last native event before release (the pointer's
 * final native target retargets off every registered light-DOM drop target —
 * e.g. onto the shadow-DOM overlay or a layout gap). use-drag-reorder's
 * onDropTargetChange guard preserves the held BLOCKED indicator across that
 * empty change (so the overlay keeps showing "allowed-under-Alt"), but
 * resolveDrop reads its target from `location.current.dropTargets[0]` and bails
 * on the `!target` guard — so the Alt override never reaches the commit.
 *
 * The `leaveBeforeDrop: false` control commits; the `true` case (the real-user
 * path) does not — isolating the empty-dropTargets-at-drop trigger.
 */

/** Does the first Card (feature-1) contain a <button>? The Card renders a div
 *  whose header slot holds the "Zero Chrome" h3. A button there means the dragged
 *  Button committed INTO Card.header — distinguishing "moved in" from "cancelled". */
const firstCardHasButton = (page: Page) =>
  page.evaluate(() => {
    const h3 = [...document.querySelectorAll("h3")].find(
      (el) => el.textContent?.trim() === "Zero Chrome",
    );
    const card = h3?.closest("div[style*='border']");
    return card?.querySelector("button") !== null;
  }) as Promise<boolean>;

test.describe("Alt-held drag onto slot-constrained container", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("control: Alt held, dropTargets present at drop → element placed", async ({
    page,
  }) => {
    const btn = page.locator("button").first();
    await btn.click();
    await page.waitForTimeout(300);

    expect(await firstCardHasButton(page)).toBe(false);

    const heading = page.locator("h3").first();
    await dispatchDragAltHeld(page, {
      from: await sourceCenter(btn),
      to: await edgePoint(heading, "top"),
      leaveBeforeDrop: false,
    });
    await page.waitForTimeout(400);

    expect(await firstCardHasButton(page)).toBe(true);
  });

  test("real-user path: Alt held, dropTargets empty at drop → element MUST still be placed", async ({
    page,
  }) => {
    const btn = page.locator("button").first();
    await btn.click();
    await page.waitForTimeout(300);

    expect(await firstCardHasButton(page)).toBe(false);

    const heading = page.locator("h3").first();
    await dispatchDragAltHeld(page, {
      from: await sourceCenter(btn),
      to: await edgePoint(heading, "top"),
      leaveBeforeDrop: true,
    });
    await page.waitForTimeout(400);

    // The held indicator showed an allowed-under-Alt drop; the Alt override must
    // commit it into Card.header. With current code this FAILS (drop cancelled).
    expect(await firstCardHasButton(page)).toBe(true);
  });

  test("void path: Alt held, hover Card.header then drop in empty space → MUST cancel", async ({
    page,
  }) => {
    const btn = page.locator("button").first();
    await btn.click();
    await page.waitForTimeout(300);

    expect(await firstCardHasButton(page)).toBe(false);

    // Hover the Card.header (blocked, Alt-overridden → indicator held), then move
    // genuinely OUT to the top-left void and release there. The release no longer
    // lands over the indicator, so the held spec must NOT commit. This guards the
    // window-leave fix (case A) from over-committing case B.
    const heading = page.locator("h3").first();
    await dispatchDragAltViaVoid(page, {
      from: await sourceCenter(btn),
      over: await edgePoint(heading, "top"),
      to: { x: 2, y: 2 },
    });
    await page.waitForTimeout(400);

    expect(await firstCardHasButton(page)).toBe(false);
  });
});
