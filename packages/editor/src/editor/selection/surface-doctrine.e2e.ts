import { test, expect } from "@playwright/test";
import {
  isToolbarVisible,
  clickToolbarAction,
  isSheetVisible,
  getSheetRect,
  getToolbarRect,
  getPageElementBox,
  countVisibleEdgeArrows,
openTestPage,
} from "../overlay/testing.js";

/** K6 observer — the supersede doctrine (sp 53): at most ONE of
 *  {selection handle, control panel} exists at any instant, and neither ever
 *  occludes the selected element (H1) or leaves the viewport (H2). */

type Box = { top: number; left: number; bottom: number; right: number };

const intersects = (a: Box, b: Box): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

test.describe("Surface doctrine — supersede + occlusion invariants", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("while the sheet is open there is NO toolbar and no edge arrow; closing restores the handle", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);
    expect(await isToolbarVisible(page)).toBe(true);

    await clickToolbarAction(page, "edit");
    await expect.poll(() => isSheetVisible(page)).toBe(true);

    // Supersede: the handle is removed from the tree, not dimmed.
    expect(await isToolbarVisible(page)).toBe(false);
    expect(await countVisibleEdgeArrows(page)).toBe(0);

    await page.keyboard.press("Escape");
    await expect.poll(() => isSheetVisible(page)).toBe(false);
    await expect.poll(() => isToolbarVisible(page)).toBe(true);
  });

  test("the open sheet's rect never intersects the selected element's rect", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);
    await clickToolbarAction(page, "edit");
    await expect.poll(() => isSheetVisible(page)).toBe(true);
    await page.waitForTimeout(300);

    const sheet = await getSheetRect(page);
    const element = await getPageElementBox(page, "h1");
    expect(sheet).not.toBeNull();
    expect(element).not.toBeNull();

    const sheetBox: Box = {
      top: sheet!.top,
      left: sheet!.left,
      bottom: sheet!.top + sheet!.height,
      right: sheet!.left + sheet!.width,
    };
    expect(intersects(sheetBox, element!)).toBe(false);
  });

  test("handle at rest with the element flush to the viewport top: flips below, never occludes, stays in viewport (H1/H2)", async ({
    page,
  }) => {
    // Pin the element to the viewport top so the default top placement has no
    // room — the bar must FLIP below the element, not slide over it.
    await page
      .locator("h1")
      .evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(200);
    await page.locator("h1").click();
    await page.waitForTimeout(400);

    const toolbar = await getToolbarRect(page);
    const element = await getPageElementBox(page, "h1");
    expect(toolbar).not.toBeNull();
    expect(element).not.toBeNull();

    // H1 — the handle never occludes the selected element's box.
    expect(intersects(toolbar!, element!)).toBe(false);

    // H2 — the handle never leaves the viewport.
    const viewport = page.viewportSize()!;
    expect(toolbar!.top).toBeGreaterThanOrEqual(0);
    expect(toolbar!.left).toBeGreaterThanOrEqual(0);
    expect(toolbar!.bottom).toBeLessThanOrEqual(viewport.height);
    expect(toolbar!.right).toBeLessThanOrEqual(viewport.width);
  });
});
