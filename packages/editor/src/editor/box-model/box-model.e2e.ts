import { test, expect, type Page } from "@playwright/test";
import {
  climbToParent,
  toggleBoxModel,
  isBoxModelToggleActive,
  readBoxModelBands,
  countBoxModelBands,
  countGapRegions,
  getBoxModelBandsRect,
  selectElement,
  settle,
  openTestPage,
} from "../overlay/testing.js";

/** Coverage for the box-model overlay (margin/padding/content bands + gap
 *  regions), previously ZERO E2E. Drives the demo catalog only: "page" (Box,
 *  padding 2rem, margin "0 auto"), "hero" (Stack vertical, gap 1.5rem, 3
 *  children, no margin), "hero-actions" (Stack horizontal, gap 0.75rem, 2
 *  Buttons). */
test.describe("Box-model overlay", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  const selectPageBox = async (page: Page) => {
    await selectElement(page, page.locator("h1"));
    await climbToParent(page); // hero
    await climbToParent(page); // page
  };

  const selectHero = async (page: Page) => {
    await selectElement(page, page.locator("h1"));
    await climbToParent(page); // hero
  };

  /** Toggle the overlay on and wait for the bands container it mounts. */
  const showBands = async (page: Page) => {
    await toggleBoxModel(page);
    await expect.poll(() => countBoxModelBands(page)).toBe(1);
  };

  test("toggling on a margined, padded element mounts margin+padding+content bands; toggling off unmounts them", async ({
    page,
  }) => {
    await selectPageBox(page);

    await showBands(page);
    expect(await isBoxModelToggleActive(page)).toBe(true);
    const bands = await readBoxModelBands(page);
    expect(new Set(bands.map((b) => b.band))).toEqual(
      new Set(["margin", "padding", "content"]),
    );

    await settle(page);
    await toggleBoxModel(page);
    // 1 → 0 is a real transition, so this poll waits on something.
    await expect.poll(() => countBoxModelBands(page)).toBe(0);
    expect(await isBoxModelToggleActive(page)).toBe(false);
    expect(await readBoxModelBands(page)).toEqual([]);
  });

  test("an element with zero margin but non-zero padding paints only padding+content bands", async ({
    page,
  }) => {
    await selectHero(page);

    await showBands(page);
    const bands = await readBoxModelBands(page);
    expect(new Set(bands.map((b) => b.band))).toEqual(
      new Set(["padding", "content"]),
    );
  });

  test("a flex parent with a visible gap paints a gap region between each pair of children", async ({
    page,
  }) => {
    await selectHero(page); // 3 children, gap 1.5rem

    await showBands(page);
    expect(await countGapRegions(page)).toBe(2);
  });

  test("a container with fewer than 2 children paints no gap region", async ({
    page,
  }) => {
    // hero-actions starts with 2 Buttons (gap 0.75rem) — delete one so the
    // live container drops below the 2-child gap threshold.
    const doomed = page.getByText("Start building");
    await selectElement(page, doomed);
    await page.keyboard.press("Delete");
    // The delete's own observable: the button leaves the light DOM.
    await doomed.waitFor({ state: "detached" });
    await settle(page);

    await selectElement(page, page.getByText("Read the docs"));
    await climbToParent(page); // hero-actions

    await showBands(page);
    expect(await countGapRegions(page)).toBe(0);
  });

  test("selecting a different element resets the toggle to off", async ({
    page,
  }) => {
    await selectPageBox(page);
    await showBands(page);
    expect(await isBoxModelToggleActive(page)).toBe(true);

    // Select a different element — the toggle must NOT carry over.
    await settle(page);
    await selectElement(page, page.locator("h1"));

    await expect.poll(() => countBoxModelBands(page)).toBe(0);
    expect(await isBoxModelToggleActive(page)).toBe(false);
    expect(await readBoxModelBands(page)).toEqual([]);
  });

  test("bands track the selected element's position through scroll", async ({
    page,
  }) => {
    await selectHero(page);
    await showBands(page);

    const before = await getBoxModelBandsRect(page);
    expect(before).not.toBeNull();

    await page.mouse.wheel(0, 400);

    // The rAF anchor loop re-reads the element rect each frame; the moved band
    // IS the observable, so poll it instead of guessing at frames + a sleep.
    await expect
      .poll(async () => (await getBoxModelBandsRect(page))?.top)
      .not.toBe(before!.top);

    const after = await getBoxModelBandsRect(page);
    expect(after).not.toBeNull();
    expect(after!.top).not.toBe(before!.top);
  });
});
