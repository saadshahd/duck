import { test, expect } from "@playwright/test";
import {
  clickToolbarAction,
  isSheetVisible,
  expandSheetDisclosures,
  readDimensionChips,
  getDimensionInputValue,
  getDimensionChipCenter,
  setDimensionValue,
  isDimensionSentinelVisible,
  isDimensionSentinelSelected,
  getDimensionSentinelCenter,
  readDimensionCustom,
} from "../overlay/testing.js";

/**
 * T6 observer O3: dimension control — preset chips + Ark NumberInput.
 * Verified against Heading.style.fontSize — a select field inside the style
 * object disclosure, annotated metadata: { control: "dimension", unit: "rem" }.
 *
 * The hero h1 heading has style.fontSize = "3rem" (a preset), so the first
 * opening asserts the "3rem" chip is selected + numeric input shows "3".
 * Then an off-grid value is typed (1.75) and persistence is checked on reopen.
 *
 * All dimension helpers accept a fieldLabel ("Font size") to scope to one field
 * when multiple dimension controls appear simultaneously on the sheet.
 *
 * Observer O3 contract: data-role="dimension" root in shadow root; one
 * data-role="dimension-chip" per preset option; data-role="dimension-sentinel"
 * when value is absent and unparseable; data-role="dimension-input" with a live
 * <input>; off-grid numeric commit persists across sheet close + reopen.
 */

// The fontSize field label in the Heading style object disclosure.
const FIELD = "Font size";

const FONT_SIZE_PRESETS = [
  "0.75rem",
  "0.875rem",
  "1rem",
  "1.125rem",
  "1.25rem",
  "1.5rem",
  "1.875rem",
  "2.25rem",
  "3rem",
];

const openHeadingSheet = async (page: import("@playwright/test").Page) => {
  // Click the hero h1 to select it.
  await page.locator("h1").click();
  await page.waitForTimeout(200);
  await clickToolbarAction(page, "edit");
  await page.waitForTimeout(400);
  // Expand style object disclosure so nested fields (including fontSize) render.
  await expandSheetDisclosures(page);
  await page.waitForTimeout(300);
};

test.describe("Dimension control — Heading.style.fontSize (T6)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  // O3a: dimension control renders one chip per preset option.
  test("O3a: dimension chips render one per fontSize preset", async ({
    page,
  }) => {
    await openHeadingSheet(page);
    expect(await isSheetVisible(page)).toBe(true);

    const chips = await readDimensionChips(page, FIELD);
    expect(chips).not.toBeNull();
    expect(chips!.length).toBe(FONT_SIZE_PRESETS.length);
    expect(chips!.map((c) => c.value)).toEqual(FONT_SIZE_PRESETS);
  });

  // O3b: preset value "3rem" → matching chip is checked, numeric input shows "3".
  test("O3b: preset value shows selected chip and numeric input", async ({
    page,
  }) => {
    await openHeadingSheet(page);

    const chips = await readDimensionChips(page, FIELD);
    expect(chips).not.toBeNull();
    const checked = chips!.filter((c) => c.checked);
    expect(checked.length).toBe(1);
    expect(checked[0].value).toBe("3rem");

    // Numeric input reflects the leading number of the stored "3rem".
    const inputVal = await getDimensionInputValue(page, FIELD);
    expect(inputVal).toBe("3");

    // Sentinel is always visible (it's the "clear" affordance) but not selected.
    expect(await isDimensionSentinelVisible(page, FIELD)).toBe(true);
    expect(await isDimensionSentinelSelected(page, FIELD)).toBe(false);
  });

  // O3c: clicking a different chip selects it (real mouse click).
  test("O3c: clicking a chip selects it and updates the numeric input", async ({
    page,
  }) => {
    await openHeadingSheet(page);

    const target = "1.5rem";
    const center = await getDimensionChipCenter(page, target, FIELD);
    expect(center).not.toBeNull();

    // Real mouse click — avoids synthetic .click() unmount-race masking.
    await page.mouse.click(center!.x, center!.y);
    await page.waitForTimeout(200);

    const chips = await readDimensionChips(page, FIELD);
    expect(chips).not.toBeNull();
    const checked = chips!.filter((c) => c.checked);
    expect(checked.length).toBe(1);
    expect(checked[0].value).toBe(target);

    // Numeric input should reflect the new value's leading number.
    const inputVal = await getDimensionInputValue(page, FIELD);
    expect(inputVal).toBe("1.5");
  });

  // O3d: typing an off-grid value in the numeric input commits a literal not in
  //       the preset list, and it persists across Escape close + reopen (O3).
  test("O3d: off-grid numeric value persists across sheet close and reopen", async ({
    page,
  }) => {
    await openHeadingSheet(page);

    // Type an off-grid value through the REAL keyboard into the real numeric
    // input — exercising zag NumberInput's input event → onValueChange → onChange
    // commit path the way a designer's keystrokes do.
    const typed = await setDimensionValue(page, "1.75", FIELD);
    expect(typed).toBe(true);
    await page.waitForTimeout(300);

    // After typing off-grid, no chip should be selected (1.75rem is not a preset).
    const chips = await readDimensionChips(page, FIELD);
    expect(chips).not.toBeNull();
    const checked = chips!.filter((c) => c.checked);
    expect(checked.length).toBe(0);

    // The numeric input should reflect 1.75.
    const inputVal = await getDimensionInputValue(page, FIELD);
    expect(inputVal).toBe("1.75");

    // Close via Escape.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    expect(await isSheetVisible(page)).toBe(false);

    // Reopen and re-expand disclosures.
    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(400);
    await expandSheetDisclosures(page);
    await page.waitForTimeout(300);

    // The off-grid value "1.75rem" should persist — no chip selected.
    const chipsAfter = await readDimensionChips(page, FIELD);
    expect(chipsAfter).not.toBeNull();
    const checkedAfter = chipsAfter!.filter((c) => c.checked);
    expect(checkedAfter.length).toBe(0);

    // Numeric input reflects the persisted off-grid value.
    const inputValAfter = await getDimensionInputValue(page, FIELD);
    expect(inputValAfter).toBe("1.75");

    // Sentinel stays visible (always rendered) but not selected — "1.75rem" is a set value.
    expect(await isDimensionSentinelVisible(page, FIELD)).toBe(true);
    expect(await isDimensionSentinelSelected(page, FIELD)).toBe(false);
  });

  // O3e: clicking the sentinel clears the dimension value.
  test("O3e: clicking sentinel clears the set value", async ({ page }) => {
    await openHeadingSheet(page);

    // Confirm a preset is initially selected (fontSize = "3rem").
    const chipsBefore = await readDimensionChips(page, FIELD);
    expect(chipsBefore!.filter((c) => c.checked).length).toBe(1);

    // Click the sentinel to clear.
    const center = await getDimensionSentinelCenter(page, FIELD);
    expect(center).not.toBeNull();
    await page.mouse.click(center!.x, center!.y);
    await page.waitForTimeout(200);

    // No chip selected; sentinel is now in selected state; input is empty.
    const chipsAfter = await readDimensionChips(page, FIELD);
    expect(chipsAfter!.filter((c) => c.checked).length).toBe(0);
    expect(await isDimensionSentinelSelected(page, FIELD)).toBe(true);
    const inputVal = await getDimensionInputValue(page, FIELD);
    expect(inputVal).toBe("");
  });

  // O3f (audit F14): a set value matching no preset must be marked so the chip row
  //   never reads as "default" while the real value hides in the number field.
  //   Sweeps all three modes: preset → no marker; off-grid literal → marker +
  //   active-source tint; cleared/unset → no marker.
  test("O3f: custom (off-grid) value is marked in the chip row", async ({
    page,
  }) => {
    await openHeadingSheet(page);

    // Preset "3rem" is selected → no custom marker.
    expect(await readDimensionCustom(page, FIELD)).toBeNull();

    // Type an off-grid literal (1.75rem is not a preset).
    expect(await setDimensionValue(page, "1.75", FIELD)).toBe(true);
    await page.waitForTimeout(300);

    // No preset chip is checked, but the value is not lost: a "Custom" marker
    // appears carrying the stored literal, and the number field is flagged as
    // the active source.
    expect(
      (await readDimensionChips(page, FIELD))!.filter((c) => c.checked).length,
    ).toBe(0);
    const custom = await readDimensionCustom(page, FIELD);
    expect(custom).not.toBeNull();
    expect(custom!.title).toContain("1.75rem");
    expect(custom!.activeSource).toBe(true);

    // Clearing to unset removes the marker (unset is the sentinel's job, not custom).
    const sentinel = await getDimensionSentinelCenter(page, FIELD);
    await page.mouse.click(sentinel!.x, sentinel!.y);
    await page.waitForTimeout(200);
    expect(await isDimensionSentinelSelected(page, FIELD)).toBe(true);
    expect(await readDimensionCustom(page, FIELD)).toBeNull();
  });
});
