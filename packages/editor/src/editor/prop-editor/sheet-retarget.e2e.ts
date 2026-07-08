import { test, expect, type Page } from "@playwright/test";
import {
  climbToParent,
  clickToolbarAction,
  isSheetVisible,
  getSheetHeaderLabel,
  expandSheetDisclosures,
  getSheetControlKind,
  readSpacing,
  getSpacingChipCenter,
} from "../overlay/testing.js";

/** Cross-cutting hook-order safety for the sheet's in-place re-target: the
 *  `editing` state re-targets on SELECT without a remount (same fiber). If a
 *  shared field key resolves to a DIFFERENT control across two elements, that
 *  is a hook-order crash only reachable via a REAL selection change while the
 *  sheet is open — not covered by the pure-render unit test
 *  (puck-fields-retarget.test.tsx). Divergent pair: `Box "page"` — style.padding
 *  uses the `dimension` control; `Banner "showcase-banner"` — style.padding uses
 *  the `spacing` control. Same key ("padding"), same nesting depth (style.*),
 *  different renderer. */
test.describe("Sheet re-target — hook-order safety", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  const collectErrors = (page: Page) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    return { consoleErrors, pageErrors };
  };

  test("retargeting from Box (dimension padding) to Banner (spacing padding) survives and swaps the control live", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);

    // Select Box "page": climb from h1 -> hero -> page.
    await page.locator("h1").click();
    await page.waitForTimeout(300);
    await climbToParent(page); // hero
    await climbToParent(page); // page

    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(300);
    expect(await isSheetVisible(page)).toBe(true);
    expect(await getSheetHeaderLabel(page)).toBe("Box");

    await expandSheetDisclosures(page);
    await page.waitForTimeout(150);
    expect(await getSheetControlKind(page, "Padding")).toBe("dimension");

    // Real canvas click on the Banner — an in-place retarget while the sheet
    // stays open (no close/reopen — that would mask the hook-order bug).
    const banner = page.locator("[data-banner]");
    await expect(banner).toBeVisible();
    await banner.scrollIntoViewIfNeeded();
    const box = await banner.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(400);

    // No hook-order crash and no other page error.
    const hookOrderWarning = consoleErrors.find((m) =>
      m.includes("change in the order of Hooks"),
    );
    expect(hookOrderWarning).toBeUndefined();
    expect(pageErrors).toEqual([]);

    // The sheet retargeted to the Banner in place.
    expect(await isSheetVisible(page)).toBe(true);
    expect(await getSheetHeaderLabel(page)).toBe("Banner");

    await expandSheetDisclosures(page);
    await page.waitForTimeout(150);

    // The control actually SWAPPED kind, not merely re-rendered as dimension.
    expect(await getSheetControlKind(page, "Padding")).toBe("spacing");

    // The now-live spacing control responds to a real interaction.
    const before = await readSpacing(page, "Padding");
    expect(before).not.toBeNull();
    const chipCenter = await getSpacingChipCenter(page, "1rem", "Padding");
    expect(chipCenter).not.toBeNull();
    await page.mouse.click(chipCenter!.x, chipCenter!.y);
    await page.waitForTimeout(200);

    const after = await readSpacing(page, "Padding");
    expect(after?.chips.find((c) => c.value === "1rem")?.checked).toBe(true);
  });
});
