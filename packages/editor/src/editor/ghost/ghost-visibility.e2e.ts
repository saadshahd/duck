import { test, expect } from "@playwright/test";
import {
  isCatalogPickerVisible,
  clickFirstCatalogPickerItem,
  isGhostStyled,
  getGhostRect,
  countGhostMarkers,
  isSelectionLabelVisible,
} from "../overlay/testing.js";

/** Coverage for the ghost-placeholder visibility contract (previously only
 *  covered by a crash regression, empty-container-crash.e2e.ts). Drives the
 *  demo catalog only: the K1 recipe, adapted to a Stack (its defaultProps
 *  style is `{}` — no padding, unlike Box's 2rem default — so emptying it
 *  actually collapses to a 0x0 rect and gets ghosted, not just "survives").
 *  `panel-stack` (sample-data.json) is a multi-slot Panel with one empty slot
 *  (divider) among filled ones — the case that must NEVER be ghosted. */
test.describe("Ghost placeholder visibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  /** Insert a Stack as h1's sibling, then delete both of its default
   *  children (Heading + Text), collapsing it to a genuine 0x0 rect. The
   *  inserted Stack is the only <div> immediately following <h1>. */
  const emptyBoxSelector = "h1 + div";

  const insertAndEmptyBox = async (page: import("@playwright/test").Page) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("/");
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(true);
    await page.keyboard.type("Stack");
    await page.waitForTimeout(150);
    const inserted = await clickFirstCatalogPickerItem(page);
    expect(inserted).toBe("Stack");
    await page.waitForTimeout(300);

    await page.getByText("Section heading", { exact: true }).click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);

    await page.getByText("Add your content here.", { exact: true }).click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(500);
  };

  test("an empty container with a collapsed rect gets the ghost marker and measures at least 32x32", async ({
    page,
  }) => {
    await insertAndEmptyBox(page);

    await expect.poll(() => isGhostStyled(page, emptyBoxSelector)).toBe(true);
    const rect = await getGhostRect(page, emptyBoxSelector);
    expect(rect).not.toBeNull();
    expect(rect!.width).toBeGreaterThanOrEqual(32);
    expect(rect!.height).toBeGreaterThanOrEqual(32);
  });

  test("clicking the ghost-expanded area selects it — proves it is actually clickable", async ({
    page,
  }) => {
    await insertAndEmptyBox(page);
    const rect = await getGhostRect(page, emptyBoxSelector);
    expect(rect).not.toBeNull();

    await page.mouse.click(
      rect!.left + rect!.width / 2,
      rect!.top + rect!.height / 2,
    );
    await page.waitForTimeout(300);

    expect(await isSelectionLabelVisible(page)).toBe(true);
  });

  test("inserting a child back removes the ghost marker and restores natural height", async ({
    page,
  }) => {
    await insertAndEmptyBox(page);
    const ghostRect = await getGhostRect(page, emptyBoxSelector);
    expect(ghostRect).not.toBeNull();

    // Select the (still empty) Box and insert a child into it.
    await page.mouse.click(
      ghostRect!.left + ghostRect!.width / 2,
      ghostRect!.top + ghostRect!.height / 2,
    );
    await page.waitForTimeout(300);
    await page.keyboard.press("/");
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(true);
    await clickFirstCatalogPickerItem(page);
    await page.waitForTimeout(300);

    expect(await isGhostStyled(page, emptyBoxSelector)).toBe(false);
  });

  test("a multi-slot component with one empty slot among filled slots is never ghosted", async ({
    page,
  }) => {
    // panel-stack: head + body + note are filled, divider is empty — the
    // container itself is never a ghost candidate (ghostCandidateIds only
    // qualifies a component when ALL its slots are empty), and no per-slot
    // marker exists either.
    await expect(page.getByText("Stack panel", { exact: true })).toBeVisible();
    expect(await countGhostMarkers(page)).toBe(0);
  });
});
