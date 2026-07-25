import { test, expect, type Page } from "@playwright/test";
import {
  countRole,
  dispatchDragAltHeld,
  dispatchDragAltViaVoid,
  selectElement,
  sourceCenter,
  edgePoint,
  openTestPage,
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
    await openTestPage(page);
  });

  test("control: Alt held, dropTargets present at drop → element placed", async ({
    page,
  }) => {
    const btn = page.locator("button").first();
    await selectElement(page, btn);

    expect(await firstCardHasButton(page)).toBe(false);

    const heading = page.locator("h3").first();
    await dispatchDragAltHeld(page, {
      from: await sourceCenter(btn),
      to: await edgePoint(heading, "top"),
      leaveBeforeDrop: false,
    });

    // The commit lands behind a view transition (animatedUpdate), so the DOM
    // change is not synchronous with the drop dispatch — poll the outcome.
    await expect.poll(() => firstCardHasButton(page)).toBe(true);
  });

  test("real-user path: Alt held, dropTargets empty at drop → element MUST still be placed", async ({
    page,
  }) => {
    const btn = page.locator("button").first();
    await selectElement(page, btn);

    expect(await firstCardHasButton(page)).toBe(false);

    const heading = page.locator("h3").first();
    await dispatchDragAltHeld(page, {
      from: await sourceCenter(btn),
      to: await edgePoint(heading, "top"),
      leaveBeforeDrop: true,
    });

    // The held indicator showed an allowed-under-Alt drop; the Alt override must
    // commit it into Card.header. With current code this FAILS (drop cancelled).
    await expect.poll(() => firstCardHasButton(page)).toBe(true);
  });

  test("void path: Alt held, hover Card.header then drop in empty space → MUST cancel", async ({
    page,
  }) => {
    const btn = page.locator("button").first();
    await selectElement(page, btn);

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

    // A poll on the negative (still no button) is vacuous — it would pass before
    // the drop could commit. A cancelled drop paints the transient cancel flash
    // (use-drag-reorder's onDrop, 700ms), so waiting for that flash proves the
    // drop was PROCESSED and took the cancel branch. Short intervals so the poll
    // cannot step over the flash's lifetime.
    await expect
      .poll(() => countRole(page, "drag-cancel-flash"), { intervals: [50] })
      .toBe(1);

    expect(await firstCardHasButton(page)).toBe(false);
  });
});
