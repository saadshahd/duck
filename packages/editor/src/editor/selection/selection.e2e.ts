import { test, expect } from "@playwright/test";
import {
  countHighlights,
  getHighlightRect,
  waitFrames,
  isToolbarVisible,
  clickToolbar,
  dispatchDrag,
  sourceCenter,
  edgePoint,
  isSlotStopVisible,
  getSlotStopRect,
  getSlotStopLabelViewportRect,
  countSelectionRings,
  selectParentElement,
  enterSlotChoice,
  readSlotBands,
  selectElement,
  settle,
  openTestPage,
} from "../overlay/testing.js";

test.describe("Editor overlay", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("hover shows highlight, mouse away clears it", async ({ page }) => {
    await page.locator("h1").hover();
    await expect.poll(() => countHighlights(page)).toBe(1);

    await page.mouse.move(10, 10);
    await expect.poll(() => countHighlights(page)).toBe(0);
  });

  test("click shows floating action bar", async ({ page }) => {
    await selectElement(page, page.locator("h3").first());

    await expect.poll(() => isToolbarVisible(page)).toBe(true);
    expect(await countHighlights(page)).toBe(1);
  });

  test("click empty space deselects", async ({ page }) => {
    await selectElement(page, page.locator("h3").first());

    await page.mouse.click(10, 10);

    await expect.poll(() => isToolbarVisible(page)).toBe(false);
    expect(await countHighlights(page)).toBe(0);
  });

  test("action bar clicks preserve selection", async ({ page }) => {
    await selectElement(page, page.locator("h3").first());
    expect(await isToolbarVisible(page)).toBe(true);

    await clickToolbar(page);
    // The bar must SURVIVE the click, so there is no new state to poll for —
    // a poll for "still visible" would pass before the click was even processed.
    await settle(page);
    expect(await isToolbarVisible(page)).toBe(true);
  });

  test("hover different elements moves highlight", async ({ page }) => {
    await page.locator("h1").hover();
    await expect.poll(() => getHighlightRect(page)).not.toBeNull();
    const rectA = await getHighlightRect(page);

    await page.locator("h2").first().hover();
    await expect.poll(() => getHighlightRect(page)).not.toEqual(rectA);
    const rectB = await getHighlightRect(page);

    expect(rectA).not.toBeNull();
    expect(rectB).not.toBeNull();
    expect(rectA).not.toEqual(rectB);
  });

  test("hover while selected does not change selection", async ({ page }) => {
    await selectElement(page, page.locator("h3").first());
    expect(await isToolbarVisible(page)).toBe(true);

    await page.locator("h1").hover();
    // The law is that NOTHING moves, so there is no post-state to poll for.
    await settle(page);

    expect(await isToolbarVisible(page)).toBe(true);
    expect(await countHighlights(page)).toBe(1);
  });

  test("selecting different element changes selection", async ({ page }) => {
    await selectElement(page, page.locator("h3").first());
    const rectA = await getHighlightRect(page);

    await page.locator("h1").click();
    await expect.poll(() => getHighlightRect(page)).not.toEqual(rectA);
    const rectB = await getHighlightRect(page);

    expect(await isToolbarVisible(page)).toBe(true);
    expect(rectA).not.toBeNull();
    expect(rectB).not.toBeNull();
    expect(rectA).not.toEqual(rectB);
  });

  test("scroll updates selection rect", async ({ page }) => {
    await selectElement(page, page.locator("h3").first());
    const rectBefore = await getHighlightRect(page);

    await page.evaluate(() => window.scrollBy(0, 100));
    // The overlay re-anchors on the next rAF pass (see the sibling test below,
    // which pins that to a two-frame budget).
    await settle(page);
    const rectAfter = await getHighlightRect(page);

    expect(rectBefore).not.toBeNull();
    expect(rectAfter).not.toBeNull();
    expect(rectBefore!.top).not.toBe(rectAfter!.top);
  });

  test("overlay tracks element within one frame after scroll", async ({
    page,
  }) => {
    await selectElement(page, page.locator("h3").first());

    const rectBefore = await getHighlightRect(page);
    expect(rectBefore).not.toBeNull();
    const topBefore = parseFloat(rectBefore!.top);

    const scrollDelta = 100;
    await page.evaluate((dy) => window.scrollBy(0, dy), scrollDelta);
    await waitFrames(page, 2);

    const rectAfter = await getHighlightRect(page);
    expect(rectAfter).not.toBeNull();
    const topAfter = parseFloat(rectAfter!.top);

    const actualDelta = topBefore - topAfter;
    expect(Math.abs(actualDelta - scrollDelta)).toBeLessThan(5);
  });

  test("toolbar stays hidden through a drag and returns after drop", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await selectElement(page, heading);
    expect(await isToolbarVisible(page)).toBe(true);

    const description = page.locator("p").first();
    const from = await sourceCenter(heading);
    const to = await edgePoint(description, "bottom");

    await dispatchDrag(page, { from, to, phase: "hold" });
    await expect.poll(() => isToolbarVisible(page)).toBe(false);

    await dispatchDrag(page, { from, to, phase: "release" });
    await expect.poll(() => isToolbarVisible(page)).toBe(true);
  });
});

test.describe("Slot address and slot-stop", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("↑ climbs node→node: selects the parent node directly, no slot stop", async ({
    page,
  }) => {
    // Climb is pure node→node navigation. From a Heading inside a Card's header
    // slot, one ↑ selects the Card node directly — it never enters slot-selected,
    // so no slot-stop band paints.
    await selectElement(page, page.locator("h3").first());

    await selectParentElement(page);
    // A climb retargets the existing selection: the ring COUNT never changes, so
    // there is no count to poll — settle for the re-anchor pass.
    await settle(page);

    expect(await isSlotStopVisible(page)).toBe(false);
    expect(await countSelectionRings(page)).toBe(1);
    expect(await isToolbarVisible(page)).toBe(true);
  });

  test("real click on the active slot label (insert flow) selects the owning node", async ({
    page,
  }) => {
    // Slot-selected is reached via the insert flow on the multi-slot Card. The
    // active slot label climbs to the node owning the slot (the Card) — the
    // binding ruling: a slot label click selects the parent node, never deselects.
    await selectElement(page, page.locator("h3").first());
    await enterSlotChoice(page);
    expect(await isSlotStopVisible(page)).toBe(true);
    await settle(page);

    // A REAL pointer click at the label's coordinates — exercises the document
    // click handler a designer triggers, unlike a synthetic .click().
    const rect = await getSlotStopLabelViewportRect(page, true);
    if (!rect) throw new Error("active slot-stop label not visible");
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);

    // The Card NODE is now selected: ring + toolbar, slot stop gone, no deselect.
    await expect.poll(() => isSlotStopVisible(page)).toBe(false);
    expect(await countSelectionRings(page)).toBe(1);
    expect(await isToolbarVisible(page)).toBe(true);
  });

  test("real click on the Card body slot label selects the Card (never deselects)", async ({
    page,
  }) => {
    // Owner's path: the body slot is active and its label sits above the body
    // band, overlapping the header band's rect — the label must still win the
    // click (z-index) and climb to the Card node, never deselect.
    await selectElement(
      page,
      page.getByText("No panels, no toolbars", { exact: false }),
    );
    await enterSlotChoice(page);
    expect(await isSlotStopVisible(page)).toBe(true);
    await settle(page);

    // Choose the body band (the middle slot) so its label is the active one.
    const bands = await readSlotBands(page);
    const sorted = [...bands].sort((a, b) => a.top - b.top);
    const body = sorted[1];
    expect(body).toBeTruthy();
    await page.mouse.click(
      (body.left + body.right) / 2,
      (body.top + body.bottom) / 2,
    );
    // Retargeting the active band leaves the band count unchanged — nothing to
    // poll for, so settle before reading the newly active label's rect.
    await settle(page);

    // Real click on the ACTIVE (body) label.
    const rect = await getSlotStopLabelViewportRect(page, true);
    if (!rect) throw new Error("active slot-stop label not visible");
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);

    // The Card NODE is now selected: ring + toolbar, slot stop gone.
    await expect.poll(() => isSlotStopVisible(page)).toBe(false);
    expect(await countSelectionRings(page)).toBe(1);
    expect(await isToolbarVisible(page)).toBe(true);
  });

  test("Escape from slot-stop (insert flow) returns to the node, slot-stop gone", async ({
    page,
  }) => {
    await selectElement(page, page.locator("h3").first());

    await enterSlotChoice(page);
    expect(await isSlotStopVisible(page)).toBe(true);
    await settle(page);

    await page.keyboard.press("Escape");

    await expect.poll(() => isSlotStopVisible(page)).toBe(false);
    expect(await isToolbarVisible(page)).toBe(true);
  });

  test("scroll keeps slot band attached (tracks live)", async ({ page }) => {
    await selectElement(page, page.locator("h3").first());

    await enterSlotChoice(page);
    const rectBefore = await getSlotStopRect(page);
    expect(rectBefore).not.toBeNull();

    await page.evaluate(() => window.scrollBy(0, 100));
    await waitFrames(page, 2);

    const rectAfter = await getSlotStopRect(page);
    expect(rectAfter).not.toBeNull();
    expect(rectBefore!.top).not.toBe(rectAfter!.top);
  });
});
