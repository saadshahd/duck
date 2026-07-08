import { test, expect } from "@playwright/test";
import {
  climbToParent,
  toggleBoxModel,
  isBoxModelToggleActive,
  readBoxModelBands,
  countGapRegions,
  getBoxModelBandsRect,
  waitFrames,
} from "../overlay/testing.js";

/** Coverage for the box-model overlay (margin/padding/content bands + gap
 *  regions), previously ZERO E2E. Drives the demo catalog only: "page" (Box,
 *  padding 2rem, margin "0 auto"), "hero" (Stack vertical, gap 1.5rem, 3
 *  children, no margin), "hero-actions" (Stack horizontal, gap 0.75rem, 2
 *  Buttons). */
test.describe("Box-model overlay", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  const selectPageBox = async (page: import("@playwright/test").Page) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);
    await climbToParent(page); // hero
    await climbToParent(page); // page
  };

  const selectHero = async (page: import("@playwright/test").Page) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);
    await climbToParent(page); // hero
  };

  test("toggling on a margined, padded element mounts margin+padding+content bands; toggling off unmounts them", async ({
    page,
  }) => {
    await selectPageBox(page);

    await toggleBoxModel(page);
    await page.waitForTimeout(150);
    expect(await isBoxModelToggleActive(page)).toBe(true);
    const bands = await readBoxModelBands(page);
    expect(new Set(bands.map((b) => b.band))).toEqual(
      new Set(["margin", "padding", "content"]),
    );

    await toggleBoxModel(page);
    await page.waitForTimeout(150);
    expect(await isBoxModelToggleActive(page)).toBe(false);
    expect(await readBoxModelBands(page)).toEqual([]);
  });

  test("an element with zero margin but non-zero padding paints only padding+content bands", async ({
    page,
  }) => {
    await selectHero(page);

    await toggleBoxModel(page);
    await page.waitForTimeout(150);
    const bands = await readBoxModelBands(page);
    expect(new Set(bands.map((b) => b.band))).toEqual(
      new Set(["padding", "content"]),
    );
  });

  test("a flex parent with a visible gap paints a gap region between each pair of children", async ({
    page,
  }) => {
    await selectHero(page); // 3 children, gap 1.5rem

    await toggleBoxModel(page);
    await page.waitForTimeout(150);
    expect(await countGapRegions(page)).toBe(2);
  });

  test("a container with fewer than 2 children paints no gap region", async ({
    page,
  }) => {
    // hero-actions starts with 2 Buttons (gap 0.75rem) — delete one so the
    // live container drops below the 2-child gap threshold.
    await page.getByText("Start building").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);

    await page.getByText("Read the docs").click();
    await page.waitForTimeout(300);
    await climbToParent(page); // hero-actions

    await toggleBoxModel(page);
    await page.waitForTimeout(150);
    expect(await countGapRegions(page)).toBe(0);
  });

  test("selecting a different element resets the toggle to off", async ({
    page,
  }) => {
    await selectPageBox(page);
    await toggleBoxModel(page);
    await page.waitForTimeout(150);
    expect(await isBoxModelToggleActive(page)).toBe(true);

    // Select a different element — the toggle must NOT carry over.
    await page.locator("h1").click();
    await page.waitForTimeout(300);

    expect(await isBoxModelToggleActive(page)).toBe(false);
    expect(await readBoxModelBands(page)).toEqual([]);
  });

  test("bands track the selected element's position through scroll", async ({
    page,
  }) => {
    await selectHero(page);
    await toggleBoxModel(page);
    await page.waitForTimeout(150);

    const before = await getBoxModelBandsRect(page);
    expect(before).not.toBeNull();

    await page.mouse.wheel(0, 400);
    await waitFrames(page, 6);
    await page.waitForTimeout(100);

    const after = await getBoxModelBandsRect(page);
    expect(after).not.toBeNull();
    expect(after!.top).not.toBe(before!.top);
  });
});
