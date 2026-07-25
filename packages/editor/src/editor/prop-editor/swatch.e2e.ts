import { test, expect } from "@playwright/test";
import {
  clickToolbarAction,
  isSheetVisible,
  expandSheetDisclosures,
  getSwatchRole,
  readSwatchItems,
  readSwatchPaints,
  isSwatchSentinelVisible,
  isSwatchSentinelSelected,
  getSwatchItemCenter,
  getSwatchSentinelCenter,
  readSwatchCustomChip,
  getSwatchInputValue,
  isSwatchInputInvalid,
  setSwatchColorText,
openTestPage,
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
    await openTestPage(page);
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

  // O2b: unset color → sentinel shows as selected, NO swatch is selected.
  // The hero h1 has style.color absent (unset) — asserts honest unset, not swatch[0].
  test("O2b: unset color shows sentinel selected and no swatch is selected", async ({
    page,
  }) => {
    await openHeadingSheet(page);

    const items = await readSwatchItems(page);
    expect(items).not.toBeNull();
    // No swatch is selected when value is unset.
    const selected = items!.filter((i) => i.checked);
    expect(selected.length).toBe(0);

    // Sentinel is visible and in selected state (it is the current "no color" value).
    expect(await isSwatchSentinelVisible(page)).toBe(true);
    expect(await isSwatchSentinelSelected(page)).toBe(true);
  });

  // O2c: clicking a swatch selects it; sentinel remains visible but loses selected state.
  test("O2c: clicking a swatch selects it and sentinel loses selected state", async ({
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

    // Sentinel stays visible (it's the "clear" affordance) but is no longer selected.
    expect(await isSwatchSentinelVisible(page)).toBe(true);
    expect(await isSwatchSentinelSelected(page)).toBe(false);
  });

  // O2e: clicking the sentinel clears a set color.
  test("O2e: clicking sentinel clears the selected color", async ({ page }) => {
    await openHeadingSheet(page);

    // First select a color.
    const target = "#111111";
    const center = await getSwatchItemCenter(page, target);
    expect(center).not.toBeNull();
    await page.mouse.click(center!.x, center!.y);
    await page.waitForTimeout(200);

    // Confirm it is selected.
    const before = await readSwatchItems(page);
    expect(before!.filter((i) => i.checked).length).toBe(1);

    // Click the sentinel to clear.
    const sentinelCenter = await getSwatchSentinelCenter(page);
    expect(sentinelCenter).not.toBeNull();
    await page.mouse.click(sentinelCenter!.x, sentinelCenter!.y);
    await page.waitForTimeout(200);

    // No swatch selected; sentinel is back in selected state.
    const after = await readSwatchItems(page);
    expect(after!.filter((i) => i.checked).length).toBe(0);
    expect(await isSwatchSentinelSelected(page)).toBe(true);
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

  // O2f: free-form entry commits an off-palette literal; the canvas updates and
  // the custom chip renders the actual color (honest literal, never the unset
  // sentinel). Picking a palette chip afterwards replaces the literal.
  test("O2f: custom color commits, shows honest custom chip, palette pick replaces it", async ({
    page,
  }) => {
    await openHeadingSheet(page);

    // No custom chip while unset.
    expect(await readSwatchCustomChip(page)).toBeNull();

    // Type an off-palette color; Enter flushes the continuous commit path.
    const typed = await setSwatchColorText(page, "#ff6b35");
    expect(typed).toBe(true);
    await page.waitForTimeout(300);

    // Canvas is the truth: the heading now paints the literal color.
    const h1Color = await page
      .locator("h1")
      .evaluate((el) => getComputedStyle(el).color);
    expect(h1Color).toBe("rgb(255, 107, 53)");

    // Custom chip shows the actual color and the verbatim literal.
    const chip = await readSwatchCustomChip(page);
    expect(chip).toEqual({
      background: "rgb(255, 107, 53)",
      title: "#ff6b35",
    });

    // Off-palette is a SET value: sentinel not selected, no palette item checked,
    // and the input mirrors the stored literal exactly (no normalization).
    expect(await isSwatchSentinelSelected(page)).toBe(false);
    const items = await readSwatchItems(page);
    expect(items!.filter((i) => i.checked).length).toBe(0);
    expect(await getSwatchInputValue(page)).toBe("#ff6b35");

    // Pick a palette chip — discrete commit replaces the literal.
    const target = "#111111";
    const center = await getSwatchItemCenter(page, target);
    expect(center).not.toBeNull();
    await page.mouse.click(center!.x, center!.y);
    await page.waitForTimeout(300);

    expect(await readSwatchCustomChip(page)).toBeNull();
    const after = await readSwatchItems(page);
    expect(after!.filter((i) => i.checked).map((i) => i.value)).toEqual([
      target,
    ]);
    const h1After = await page
      .locator("h1")
      .evaluate((el) => getComputedStyle(el).color);
    expect(h1After).toBe("rgb(17, 17, 17)");
  });

  // O2g: invalid color text never commits — the draft is marked invalid while
  // in flight, and flushing reverts to the stored truth (canvas + chips + input).
  test("O2g: invalid color text does not commit and reverts to stored value", async ({
    page,
  }) => {
    await openHeadingSheet(page);

    // Establish a stored palette value first.
    const target = "#555555";
    const center = await getSwatchItemCenter(page, target);
    await page.mouse.click(center!.x, center!.y);
    await page.waitForTimeout(200);

    // Type garbage without flushing — the input honestly marks the draft invalid.
    await setSwatchColorText(page, "not-a-color", { flush: false });
    expect(await isSwatchInputInvalid(page)).toBe(true);

    // Flush; nothing commits and the control reverts to the stored value.
    await page.keyboard.press("Enter");
    await page.waitForTimeout(350);

    expect(await readSwatchCustomChip(page)).toBeNull();
    const items = await readSwatchItems(page);
    expect(items!.filter((i) => i.checked).map((i) => i.value)).toEqual([
      target,
    ]);
    expect(await getSwatchInputValue(page)).toBe(target);
    expect(await isSwatchInputInvalid(page)).toBe(false);
    const h1Color = await page
      .locator("h1")
      .evaluate((el) => getComputedStyle(el).color);
    expect(h1Color).toBe("rgb(85, 85, 85)");
  });
});
