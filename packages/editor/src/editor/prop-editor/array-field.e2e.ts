import { test, expect, type Page } from "@playwright/test";
import {
  clickToolbarAction,
  climbToParent,
  toggleSheetDisclosure,
  readArrayRows,
  readArrayAdd,
  clickArrayAdd,
  clickArrayRowAction,
} from "../overlay/testing.js";

/** All rendered tag chips across the page, in document order. The demo Card
 *  renders its `tags` array prop as [data-tag] spans, so this is the canvas
 *  observer for every structural array op. */
const canvasTags = (page: Page) => page.locator("[data-tag]").allTextContents();

/** Open the prop sheet for the Card containing the given heading, then expand
 *  its Tags array disclosure. */
const openCardTags = async (page: Page, headingText: string) => {
  await page.getByText(headingText).click();
  await page.waitForTimeout(300);
  await climbToParent(page); // Heading → Card
  await clickToolbarAction(page, "edit");
  await page.waitForTimeout(400);
  expect(await toggleSheetDisclosure(page, "Tags")).toBe(true);
  await page.waitForTimeout(200);
};

test.describe("Array field management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("add appends a defaultItemProps item — summary and canvas update", async ({
    page,
  }) => {
    await openCardTags(page, "MCP-Native");

    const before = await readArrayRows(page);
    expect(before?.map((r) => r.summary)).toEqual(["Alpha", "Beta"]);

    expect(await clickArrayAdd(page)).toBe(true);
    await page.waitForTimeout(300);

    const after = await readArrayRows(page);
    expect(after?.map((r) => r.summary)).toEqual(["Alpha", "Beta", "New tag"]);
    expect(await canvasTags(page)).toEqual([
      "Design",
      "Alpha",
      "Beta",
      "New tag",
    ]);
  });

  test("add is disabled with a reason at max", async ({ page }) => {
    await openCardTags(page, "MCP-Native");

    // 2 stored tags, max 4 — two adds reach the ceiling.
    expect(await clickArrayAdd(page)).toBe(true);
    await page.waitForTimeout(200);
    expect(await clickArrayAdd(page)).toBe(true);
    await page.waitForTimeout(200);

    expect(await readArrayAdd(page)).toEqual({
      disabled: true,
      reason: "Maximum 4 items",
    });
  });

  test("remove at min is disabled with a reason", async ({ page }) => {
    await openCardTags(page, "Zero Chrome");

    const rows = await readArrayRows(page);
    expect(rows?.length).toBe(1);
    expect(rows?.[0].remove).toEqual({
      disabled: true,
      reason: "Minimum 1 item",
    });
    // A disabled affordance must not write.
    expect(await clickArrayRowAction(page, 0, "remove")).toBe(false);
    expect(await canvasTags(page)).toContain("Design");
  });

  test("remove above min deletes the item — sheet and canvas update", async ({
    page,
  }) => {
    await openCardTags(page, "MCP-Native");

    expect(await clickArrayRowAction(page, 1, "remove")).toBe(true);
    await page.waitForTimeout(300);

    const rows = await readArrayRows(page);
    expect(rows?.map((r) => r.summary)).toEqual(["Alpha"]);
    expect(await canvasTags(page)).toEqual(["Design", "Alpha"]);
  });

  test("move buttons reorder — sheet and canvas order match, ends disabled", async ({
    page,
  }) => {
    await openCardTags(page, "MCP-Native");

    const before = await readArrayRows(page);
    expect(before?.[0].up.disabled).toBe(true); // first row can't go up
    expect(before?.[0].up.reason).toBe("Already first");
    expect(before?.[1].down.disabled).toBe(true); // last row can't go down
    expect(before?.[1].down.reason).toBe("Already last");

    expect(await clickArrayRowAction(page, 0, "down")).toBe(true);
    await page.waitForTimeout(300);

    const after = await readArrayRows(page);
    expect(after?.map((r) => r.summary)).toEqual(["Beta", "Alpha"]);
    expect(await canvasTags(page)).toEqual(["Design", "Beta", "Alpha"]);
  });

  test("structural ops land as separate history entries", async ({ page }) => {
    await openCardTags(page, "MCP-Native");

    expect(await clickArrayAdd(page)).toBe(true);
    await page.waitForTimeout(200);
    expect(await clickArrayRowAction(page, 0, "down")).toBe(true);
    await page.waitForTimeout(200);
    expect(await canvasTags(page)).toEqual([
      "Design",
      "Beta",
      "Alpha",
      "New tag",
    ]);

    // Close the sheet, then undo twice: one entry per op, not one coalesced.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(300);
    expect(await canvasTags(page)).toEqual([
      "Design",
      "Alpha",
      "Beta",
      "New tag",
    ]);
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(300);
    expect(await canvasTags(page)).toEqual(["Design", "Alpha", "Beta"]);
  });
});
