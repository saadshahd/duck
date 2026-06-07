import { test, expect } from "@playwright/test";
import {
  clickToolbarAction,
  isSheetVisible,
  expandSheetDisclosures,
  getSwatchRole,
  readSwatchItems,
  readSwatchPaints,
  isSwatchSentinelVisible,
  getSwatchItemCenter,
} from "../overlay/testing.js";

/**
 * T5 observer O2: swatch grid color control — Ark SegmentGroup rendering
 * color swatches. Verified against Heading.style.color — a select field inside
 * the style object disclosure, annotated metadata: { control: "swatch" }.
 *
 * The hero h1 heading has no style.color set (unset by default), so the first
 * opening asserts SENTINEL visible + NO swatch selected. Then a swatch is picked
 * via real mouse click and persistence is checked on reopen.
 *
 * Observer O2 contract: data-role="swatch" grid in shadow root; one
 * data-role="swatch-item" per palette option; data-role="swatch-sentinel" when
 * unset; selected item carries data-state="checked"; selection persists.
 */

const COLOR_PALETTE = [
  "#111111",
  "#2F3437",
  "#555555",
  "#888888",
  "#CCCCCC",
  "#EAEAEA",
  "#F7F6F3",
  "#FBFBFA",
  "#FFFFFF",
  "#FDEBEC",
  "#E1F3FE",
  "#EDF3EC",
  "#FBF3DB",
];

const openHeadingSheet = async (page: import("@playwright/test").Page) => {
  await page.locator("h1").click();
  await page.waitForTimeout(200);
  await clickToolbarAction(page, "edit");
  await page.waitForTimeout(400);
  // Expand style object disclosure so nested fields (including color) render.
  await expandSheetDisclosures(page);
  await page.waitForTimeout(300);
};

test.describe("Swatch color control — Heading.style.color (T5)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  // O2a: swatch grid renders one item per palette option inside the shadow root,
  //      and its root carries role="radiogroup" (the Ark SegmentGroup contract).
  test("O2a: swatch grid renders one item per palette color option", async ({
    page,
  }) => {
    await openHeadingSheet(page);
    expect(await isSheetVisible(page)).toBe(true);

    // Root is an ARIA radiogroup — single-select keyboard group reaches the DOM.
    expect(await getSwatchRole(page)).toBe("radiogroup");

    const items = await readSwatchItems(page);
    expect(items).not.toBeNull();
    expect(items!.length).toBe(COLOR_PALETTE.length);
    // Values match the palette hex strings.
    expect(items!.map((i) => i.value)).toEqual(COLOR_PALETTE);

    // Each swatch's color block actually PAINTS — a non-zero box with a real
    // background. Guards the collapsed-wrapper regression that data-attribute
    // reads alone cannot catch.
    const paints = await readSwatchPaints(page);
    expect(paints).not.toBeNull();
    for (const p of paints!) {
      expect(p.width).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
      expect(p.background).not.toBe("rgba(0, 0, 0, 0)");
      expect(p.background).not.toBe("transparent");
    }
  });

  // O2b: unset color → sentinel shows, NO swatch is selected.
  // The hero h1 has style.color absent (unset) — asserts honest unset, not swatch[0].
  test("O2b: unset color shows sentinel and no swatch is selected", async ({
    page,
  }) => {
    await openHeadingSheet(page);

    const items = await readSwatchItems(page);
    expect(items).not.toBeNull();
    // No swatch is selected when value is unset.
    const selected = items!.filter((i) => i.checked);
    expect(selected.length).toBe(0);

    // Sentinel indicator is visible.
    expect(await isSwatchSentinelVisible(page)).toBe(true);
  });

  // O2c: clicking a swatch selects it (real mouse click, not synthetic).
  test("O2c: clicking a swatch selects it and sentinel disappears", async ({
    page,
  }) => {
    await openHeadingSheet(page);

    // Pick the first non-white swatch ("#111111").
    const target = "#111111";
    const center = await getSwatchItemCenter(page, target);
    expect(center).not.toBeNull();

    // Real mouse click — avoids synthetic .click() unmount-race masking.
    await page.mouse.click(center!.x, center!.y);
    await page.waitForTimeout(200);

    const items = await readSwatchItems(page);
    expect(items).not.toBeNull();
    const selected = items!.filter((i) => i.checked);
    expect(selected.length).toBe(1);
    expect(selected[0].value).toBe(target);

    // Sentinel must be gone once a value is selected.
    expect(await isSwatchSentinelVisible(page)).toBe(false);
  });

  // O2d: selected swatch persists across Escape close + reopen + re-expand.
  test("O2d: selected color persists across sheet close and reopen", async ({
    page,
  }) => {
    await openHeadingSheet(page);

    const target = "#555555";
    const center = await getSwatchItemCenter(page, target);
    expect(center).not.toBeNull();
    await page.mouse.click(center!.x, center!.y);
    await page.waitForTimeout(200);

    // Close via Escape.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    expect(await isSheetVisible(page)).toBe(false);

    // Reopen and re-expand disclosures.
    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(400);
    await expandSheetDisclosures(page);
    await page.waitForTimeout(300);

    const items = await readSwatchItems(page);
    expect(items).not.toBeNull();
    const selected = items!.filter((i) => i.checked);
    expect(selected.length).toBe(1);
    expect(selected[0].value).toBe(target);
  });
});
