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
 * All dimension helpers accept a fieldLabel ("fontSize") to scope to one field
 * when multiple dimension controls appear simultaneously on the sheet.
 *
 * Observer O3 contract: data-role="dimension" root in shadow root; one
 * data-role="dimension-chip" per preset option; data-role="dimension-sentinel"
 * when value is absent and unparseable; data-role="dimension-input" with a live
 * <input>; off-grid numeric commit persists across sheet close + reopen.
 */

// The fontSize field label in the Heading style object disclosure.
const FIELD = "fontSize";

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
    await page.goto("/");
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

    // Sentinel must not show when a value is set.
    expect(await isDimensionSentinelVisible(page, FIELD)).toBe(false);
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

    // Sentinel must NOT show — "1.75rem" is a set off-grid literal.
    expect(await isDimensionSentinelVisible(page, FIELD)).toBe(false);
  });
});
