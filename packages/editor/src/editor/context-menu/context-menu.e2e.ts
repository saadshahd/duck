import { test, expect } from "@playwright/test";
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
} from "../overlay/testing.js";

test.describe("Context menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("real right-click on a nested element opens the menu with its ancestry", async ({
    page,
  }) => {
    // Real right-click — a synthetic contextmenu dispatch on the light-DOM
    // element can't be driven through agent-browser's CLI (see
    // project_agent_browser_trigger_limits), but Playwright's own button:
    // "right" fires a genuine native contextmenu event our listener catches.
    await page.locator("h3").first().click({ button: "right" });
    await page.waitForTimeout(300);

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
    await page.locator("h3").first().click({ button: "right" });
    await page.waitForTimeout(300);

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
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);

    await page.locator("h3").first().click({ button: "right" });
    await page.waitForTimeout(300);

    const actions = await getContextMenuActions(page);
    const byLabel = Object.fromEntries(actions.map((a) => [a.label, a]));
    expect(byLabel["Copy"]?.disabled).toBe(false);
    expect(byLabel["Cut"]?.disabled).toBe(false);
    expect(byLabel["Duplicate"]?.disabled).toBe(false);
  });

  test("clicking an ancestry item selects that element and closes the menu", async ({
    page,
  }) => {
    await page.locator("h3").first().click({ button: "right" });
    await page.waitForTimeout(300);
    expect(await isContextMenuVisible(page)).toBe(true);

    await clickContextMenuAncestryItem(page, "Card");
    await page.waitForTimeout(300);

    expect(await isContextMenuVisible(page)).toBe(false);
    expect(await isToolbarVisible(page)).toBe(true);
    expect(await countSelectionRings(page)).toBe(1);
  });

  test("Escape closes the menu without changing selection", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);

    await page.locator("h1").click({ button: "right" });
    await page.waitForTimeout(300);
    expect(await isContextMenuVisible(page)).toBe(true);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    expect(await isContextMenuVisible(page)).toBe(false);
    expect(await isToolbarVisible(page)).toBe(true);
  });

  test("ArrowDown highlights the first ancestry item, ArrowUp wraps to the last", async ({
    page,
  }) => {
    await page.locator("h3").first().click({ button: "right" });
    await page.waitForTimeout(300);

    expect(await getContextMenuActiveIndex(page)).toBeNull();

    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(100);
    expect(await getContextMenuActiveIndex(page)).toBe(0);

    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(100);
    const ancestryCount = (await getContextMenuAncestryTypes(page)).length;
    expect(await getContextMenuActiveIndex(page)).toBe(ancestryCount - 1);
  });

  test("Enter with a highlighted ancestry item selects it", async ({
    page,
  }) => {
    await page.locator("h3").first().click({ button: "right" });
    await page.waitForTimeout(300);

    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(100);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    expect(await isContextMenuVisible(page)).toBe(false);
    expect(await isToolbarVisible(page)).toBe(true);
  });

  test("Duplicate action, opened with a selection, closes the menu and commits a copy", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);

    await page.locator("h1").click({ button: "right" });
    await page.waitForTimeout(300);

    const h1CountBefore = await page.locator("h1").count();
    await clickContextMenuAction(page, "Duplicate");
    await page.waitForTimeout(300);

    expect(await isContextMenuVisible(page)).toBe(false);
    expect(await page.locator("h1").count()).toBe(h1CountBefore + 1);
  });
});
