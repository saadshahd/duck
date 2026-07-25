import { test, expect } from "@playwright/test";
import {
  isCatalogPickerVisible,
  clickFirstCatalogPickerItem,
openTestPage,
} from "../overlay/testing.js";

/** BLOCKER repro (Smoke test findings): a container collapsing to zero children
 *  (a ghost candidate) crashed the whole editor with "React has detected a
 *  change in the order of Hooks called by Editor" -> unmount -> blank page,
 *  session lost. This pins the repro: insert a Box (two default children),
 *  delete both children, and the editor must survive — rendered page intact,
 *  no React hook-order warning, no page crash. */
test.describe("Empty-container ghost path does not crash the editor", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  const collectErrors = (page: import("@playwright/test").Page) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    return { consoleErrors, pageErrors };
  };

  test("deleting all children of a container survives — no hook-order crash", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);

    // Insert a Box (default children: Heading "Section heading" + Text "Add
    // your content here.") as a sibling of the hero heading.
    await page.locator("h1").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("/");
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(true);
    const inserted = await clickFirstCatalogPickerItem(page);
    expect(inserted).toBe("Box");
    await page.waitForTimeout(300);

    // Delete the Box's two default children one at a time — the second delete
    // collapses the Box to zero children (a ghost candidate).
    await page.getByText("Section heading", { exact: true }).click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);

    await page.getByText("Add your content here.", { exact: true }).click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(500);

    // The editor must still be alive: the hero heading (untouched sibling) is
    // still rendered — a crash unmounts the whole tree to a blank page.
    await expect(page.locator("h1")).toBeVisible();

    const hookOrderWarning = consoleErrors.find((m) =>
      m.includes("change in the order of Hooks"),
    );
    expect(hookOrderWarning).toBeUndefined();
    expect(pageErrors).toEqual([]);
  });

  test("emptying a Box inside a Card body slot survives — original smoke-test repro", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);

    // Exact smoke-test path: select a card-body Text, insert a Box as its
    // sibling inside the Card body slot, then delete the Box's two default
    // children — the Box collapses to a ghost candidate inside the slot.
    await page.getByText("No panels, no toolbars.", { exact: false }).click();
    await page.waitForTimeout(300);
    await page.keyboard.press("/");
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(true);
    const inserted = await clickFirstCatalogPickerItem(page);
    expect(inserted).toBe("Box");
    await page.waitForTimeout(300);

    await page.getByText("Section heading", { exact: true }).click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);

    await page.getByText("Add your content here.", { exact: true }).click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(500);

    await expect(page.locator("h1")).toBeVisible();

    const hookOrderWarning = consoleErrors.find((m) =>
      m.includes("change in the order of Hooks"),
    );
    expect(hookOrderWarning).toBeUndefined();
    expect(pageErrors).toEqual([]);
  });
});
