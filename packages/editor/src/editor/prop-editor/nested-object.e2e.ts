import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  clickToolbarAction,
  isSheetVisible,
  readDisclosureTriggers,
  clickDisclosureTrigger,
} from "../overlay/testing.js";

/**
 * Nested object disclosure — a `style.border` object (Banner showcase) rendered
 * inside the always-open Style section. A top-level object stays a section
 * landmark; a nested object becomes a hanging-caret disclosure, collapsed by
 * default, that reveals its own fields (border width = a dimension control,
 * border color = a swatch) on open. width uses data-role="dimension"; the Banner
 * sheet has no other dimension control, so its count is a clean observer for the
 * nested fields being mounted only while the group is open.
 */

const openBannerSheet = async (page: Page) => {
  await page.locator("[data-banner]").scrollIntoViewIfNeeded();
  await page.locator("[data-banner]").click();
  await page.waitForTimeout(200);
  await clickToolbarAction(page, "edit");
  await page.waitForTimeout(400);
};

/** Count of a given data-role inside the overlay shadow root. */
const countRole = (page: Page, role: string) =>
  page.evaluate((r) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
        continue;
      return d.shadowRoot.querySelectorAll(`[data-role='${r}']`).length;
    }
    return 0;
  }, role) as Promise<number>;

test.describe("Nested object disclosure — Banner.style.border", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("nested object is a collapsed disclosure; its fields mount only on open", async ({
    page,
  }) => {
    await openBannerSheet(page);
    expect(await isSheetVisible(page)).toBe(true);

    // The nested "Border" group renders as a disclosure trigger, collapsed.
    const before = await readDisclosureTriggers(page);
    const border = before.find((t) => t.label === "Border");
    expect(border).toBeDefined();
    expect(border!.open).toBe(false);

    // Collapsed → the nested width dimension control is not mounted.
    expect(await countRole(page, "dimension")).toBe(0);

    // Open the Border group by its label (not expand-all).
    expect(await clickDisclosureTrigger(page, "Border")).toBe(true);

    const after = await readDisclosureTriggers(page);
    expect(after.find((t) => t.label === "Border")!.open).toBe(true);

    // Open → the nested width dimension control is revealed.
    expect(await countRole(page, "dimension")).toBe(1);
  });

  test("the always-open Style section is not itself a disclosure", async ({
    page,
  }) => {
    await openBannerSheet(page);

    // Top-level style object → uppercase section landmark, never a caret trigger.
    // Only nested groups (Border) appear as disclosure triggers here.
    const triggers = await readDisclosureTriggers(page);
    expect(triggers.some((t) => t.label === "Style")).toBe(false);
    expect(triggers.some((t) => t.label === "Border")).toBe(true);
  });
});
