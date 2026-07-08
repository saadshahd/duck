import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  clickToolbarAction,
  isSheetVisible,
  readRadioGroup,
  getRadioOptionCenter,
  arrowNavRadio,
} from "../overlay/testing.js";

/**
 * Radio control — native <input type=radio> restyled, layout chosen by data.
 * Verified against the Banner showcase (demo): `emphasis` is 3 short options
 * (Low/Medium/High) → segmented; `tone` is 5 longer options → stacked. Both
 * fields render at the top of the Banner sheet, so no disclosure expansion is
 * needed. Observers: honest checked state, real-click reselection, and native
 * arrow-key roving navigation (the a11y contract we kept native inputs for).
 */

const openBannerSheet = async (page: Page) => {
  await page.locator("[data-banner]").scrollIntoViewIfNeeded();
  await page.locator("[data-banner]").click();
  await page.waitForTimeout(200);
  await clickToolbarAction(page, "edit");
  await page.waitForTimeout(400);
};

test.describe("Radio control — Banner.emphasis / Banner.tone", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  test("emphasis (3 short options) renders segmented with the stored value checked", async ({
    page,
  }) => {
    await openBannerSheet(page);
    expect(await isSheetVisible(page)).toBe(true);

    const group = await readRadioGroup(page, "Emphasis");
    expect(group).not.toBeNull();
    expect(group!.layout).toBe("segmented");
    expect(group!.options.map((o) => o.value)).toEqual([
      "low",
      "medium",
      "high",
    ]);
    // Banner default emphasis is "high".
    expect(group!.options.filter((o) => o.checked).map((o) => o.value)).toEqual(
      ["high"],
    );
  });

  test("tone (5 longer options) renders stacked with the stored value checked", async ({
    page,
  }) => {
    await openBannerSheet(page);

    const group = await readRadioGroup(page, "Tone");
    expect(group).not.toBeNull();
    expect(group!.layout).toBe("stacked");
    expect(group!.options.length).toBe(5);
    // Banner default tone is "warning".
    expect(group!.options.filter((o) => o.checked).map((o) => o.value)).toEqual(
      ["warning"],
    );
  });

  test("clicking a segmented option selects it (real mouse click)", async ({
    page,
  }) => {
    await openBannerSheet(page);

    const center = await getRadioOptionCenter(page, "low", "Emphasis");
    expect(center).not.toBeNull();
    await page.mouse.click(center!.x, center!.y);
    await page.waitForTimeout(200);

    const group = await readRadioGroup(page, "Emphasis");
    expect(group!.options.filter((o) => o.checked).map((o) => o.value)).toEqual(
      ["low"],
    );
  });

  test("arrow keys move the native radio selection (a11y roving nav)", async ({
    page,
  }) => {
    await openBannerSheet(page);

    // Focus starts on the checked option (warning); ArrowDown moves to the next
    // native radio in the group and selects it (critical).
    const after = await arrowNavRadio(page, "ArrowDown", "Tone");
    expect(after).toBe("critical");
  });
});
