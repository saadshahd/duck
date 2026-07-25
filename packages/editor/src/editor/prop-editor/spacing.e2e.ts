import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  clickToolbarAction,
  isSheetVisible,
  readSpacing,
  clickSpacingLink,
  getSpacingChipCenter,
  getSpacingSentinelCenter,
  selectElement,
  openTestPage,
} from "../overlay/testing.js";

/**
 * Spacing control — 1–4 token CSS shorthand editor (Banner showcase). The Banner
 * defaults exercise both shapes at once inside the always-open Style section:
 * `padding` = "1.5rem" (linked, a preset) and `margin` = "0 auto" (unlinked, a
 * two-axis value). Observers: honest linked/unlinked derivation, chip match,
 * per-side split, the link toggle round-trip, and the clear sentinel.
 */

const openBannerSheet = async (page: Page) => {
  await page.locator("[data-banner]").scrollIntoViewIfNeeded();
  await selectElement(page, page.locator("[data-banner]"));
  await clickToolbarAction(page, "edit");
  await expect.poll(() => isSheetVisible(page)).toBe(true);
};

test.describe("Spacing control — Banner.style.padding / margin", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("a linked preset value shows the chip checked, one input, no sides", async ({
    page,
  }) => {
    await openBannerSheet(page);
    expect(await isSheetVisible(page)).toBe(true);

    const s = await readSpacing(page, "Padding");
    expect(s).not.toBeNull();
    expect(s!.linked).toBe(true);
    expect(s!.linkedInput).toBe("1.5");
    expect(s!.sides).toBeNull();
    expect(s!.sentinelSelected).toBe(false);
    expect(s!.chips.filter((c) => c.checked).map((c) => c.value)).toEqual([
      "1.5rem",
    ]);
  });

  test("a two-axis value opens unlinked with the four sides split honestly", async ({
    page,
  }) => {
    await openBannerSheet(page);

    const s = await readSpacing(page, "Margin");
    expect(s).not.toBeNull();
    expect(s!.linked).toBe(false);
    expect(s!.linkedInput).toBeNull();
    // "0 auto" → top/bottom = 0, left/right = auto (keyword survives verbatim).
    expect(s!.sides).toEqual({
      top: "0",
      right: "auto",
      bottom: "0",
      left: "auto",
    });
  });

  test("the link toggle splits a linked value into four equal sides", async ({
    page,
  }) => {
    await openBannerSheet(page);

    // Padding is linked ("1.5rem"); unlink → four sides each seeded to "1.5rem".
    expect(await clickSpacingLink(page, "Padding")).toBe(true);

    const s = await readSpacing(page, "Padding");
    expect(s!.linked).toBe(false);
    expect(s!.sides).toEqual({
      top: "1.5rem",
      right: "1.5rem",
      bottom: "1.5rem",
      left: "1.5rem",
    });
  });

  test("clicking a preset chip re-links an unlinked value", async ({
    page,
  }) => {
    await openBannerSheet(page);

    // Margin starts unlinked ("0 auto"); a chip click commits one linked token.
    const center = await getSpacingChipCenter(page, "1rem", "Margin");
    expect(center).not.toBeNull();
    await page.mouse.click(center!.x, center!.y);

    // A chip is a discrete commit — re-linking is its observable (margin opened
    // unlinked, so this cannot pass before the click lands).
    await expect
      .poll(() => readSpacing(page, "Margin").then((s) => s?.linked))
      .toBe(true);

    const s = await readSpacing(page, "Margin");
    expect(s!.linked).toBe(true);
    expect(s!.linkedInput).toBe("1");
    expect(s!.chips.filter((c) => c.checked).map((c) => c.value)).toEqual([
      "1rem",
    ]);
  });

  test("the clear sentinel unsets the value honestly", async ({ page }) => {
    await openBannerSheet(page);

    const center = await getSpacingSentinelCenter(page, "Padding");
    expect(center).not.toBeNull();
    await page.mouse.click(center!.x, center!.y);

    // Padding opened set ("1.5rem"), so the sentinel turning selected is the
    // clear's observable, not a state the poll could pass through vacuously.
    await expect
      .poll(() => readSpacing(page, "Padding").then((s) => s?.sentinelSelected))
      .toBe(true);

    const s = await readSpacing(page, "Padding");
    expect(s!.sentinelSelected).toBe(true);
    expect(s!.linkedInput).toBe("");
    expect(s!.chips.some((c) => c.checked)).toBe(false);
  });
});
