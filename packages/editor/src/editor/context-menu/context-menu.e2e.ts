import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  isContextMenuVisible,
  getContextMenuNavLabel,
  getContextMenuAncestryTypes,
  getContextMenuActions,
  clickContextMenuAncestryItem,
  clickContextMenuAction,
  getContextMenuActiveIndex,
  countSelectionRings,
  isToolbarVisible,
  selectElement,
  settle,
  openTestPage,
} from "../overlay/testing.js";

/** Right-click the target and wait for the menu the click opens — mount is the
 *  observable, not elapsed time. The trailing `settle` is for the next INPUT:
 *  the mount poll resolves the instant the DOM changes, mid-commit, and a
 *  keypress fired there can race the menu's own keydown wiring. */
const openContextMenu = async (page: Page, target: Locator) => {
  await target.click({ button: "right" });
  await expect.poll(() => isContextMenuVisible(page)).toBe(true);
  await settle(page);
};

test.describe("Context menu", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("real right-click on a nested element opens the menu with its ancestry", async ({
    page,
  }) => {
    // Real right-click — a synthetic contextmenu dispatch on the light-DOM
    // element can't be driven through agent-browser's CLI (see
    // project_agent_browser_trigger_limits), but Playwright's own button:
    // "right" fires a genuine native contextmenu event our listener catches.
    await openContextMenu(page, page.locator("h3").first());

    expect(await isContextMenuVisible(page)).toBe(true);
    // The nav group is labelled so the breadcrumb reads as navigation, not
    // another action row.
    expect(await getContextMenuNavLabel(page)).toBe("Select element");
    const ancestry = await getContextMenuAncestryTypes(page);
    expect(ancestry[0]).toBe("Heading");
    expect(ancestry).toContain("Card");
  });

  test("nothing selected beforehand: clipboard actions needing a selection are disabled, Paste is not", async ({
    page,
  }) => {
    await openContextMenu(page, page.locator("h3").first());

    const actions = await getContextMenuActions(page);
    const byLabel = Object.fromEntries(actions.map((a) => [a.label, a]));
    expect(byLabel["Copy"]?.disabled).toBe(true);
    expect(byLabel["Cut"]?.disabled).toBe(true);
    expect(byLabel["Duplicate"]?.disabled).toBe(true);
    expect(byLabel["Paste"]?.disabled).toBe(false);
  });

  test("with an active selection: needsSelection actions are enabled", async ({
    page,
  }) => {
    await selectElement(page, page.locator("h3").first());

    await openContextMenu(page, page.locator("h3").first());

    const actions = await getContextMenuActions(page);
    const byLabel = Object.fromEntries(actions.map((a) => [a.label, a]));
    expect(byLabel["Copy"]?.disabled).toBe(false);
    expect(byLabel["Cut"]?.disabled).toBe(false);
    expect(byLabel["Duplicate"]?.disabled).toBe(false);
  });

  test("clicking an ancestry item selects that element and closes the menu", async ({
    page,
  }) => {
    await openContextMenu(page, page.locator("h3").first());
    expect(await isContextMenuVisible(page)).toBe(true);

    await clickContextMenuAncestryItem(page, "Card");

    // Each of the three is a real transition off the open-menu state, so every
    // poll waits on something that has to happen.
    await expect.poll(() => isContextMenuVisible(page)).toBe(false);
    await expect.poll(() => isToolbarVisible(page)).toBe(true);
    await expect.poll(() => countSelectionRings(page)).toBe(1);
  });

  test("Escape closes the menu without changing selection", async ({
    page,
  }) => {
    await selectElement(page, page.locator("h1"));

    await openContextMenu(page, page.locator("h1"));
    expect(await isContextMenuVisible(page)).toBe(true);

    await page.keyboard.press("Escape");

    await expect.poll(() => isContextMenuVisible(page)).toBe(false);
    expect(await isToolbarVisible(page)).toBe(true);
  });

  test("ArrowDown highlights the first ancestry item, ArrowUp wraps to the last", async ({
    page,
  }) => {
    await openContextMenu(page, page.locator("h3").first());

    expect(await getContextMenuActiveIndex(page)).toBeNull();

    await page.keyboard.press("ArrowDown");
    await expect.poll(() => getContextMenuActiveIndex(page)).toBe(0);
    await settle(page);

    await page.keyboard.press("ArrowUp");
    const ancestryCount = (await getContextMenuAncestryTypes(page)).length;
    await expect
      .poll(() => getContextMenuActiveIndex(page))
      .toBe(ancestryCount - 1);
  });

  test("Enter with a highlighted ancestry item selects it", async ({
    page,
  }) => {
    await openContextMenu(page, page.locator("h3").first());

    await page.keyboard.press("ArrowDown");
    await expect.poll(() => getContextMenuActiveIndex(page)).toBe(0);
    await settle(page);

    await page.keyboard.press("Enter");

    await expect.poll(() => isContextMenuVisible(page)).toBe(false);
    await expect.poll(() => isToolbarVisible(page)).toBe(true);
  });

  test("Duplicate action, opened with a selection, closes the menu and commits a copy", async ({
    page,
  }) => {
    await selectElement(page, page.locator("h1"));

    await openContextMenu(page, page.locator("h1"));

    const h1CountBefore = await page.locator("h1").count();
    await clickContextMenuAction(page, "Duplicate");

    await expect.poll(() => isContextMenuVisible(page)).toBe(false);
    await expect(page.locator("h1")).toHaveCount(h1CountBefore + 1);
  });
});
