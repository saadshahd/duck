import { test, expect, type Page } from "@playwright/test";
import {
  clickToolbarAction,
  climbToParent,
  toggleSheetDisclosure,
  readArrayRows,
  readArrayRowFields,
  readArrayAdd,
  clickArrayAdd,
  clickArrayRowAction,
  realRemoveArrayRow,
  isPropSheetOpen,
  hoverTimelineRail,
  hoverTimelineDot,
  readTimelineDots,
  getTimelineTooltipText,
} from "../overlay/testing.js";

/** All rendered tag chips across the page, in document order. The demo Card
 *  renders its `tags` array prop as [data-tag] spans, so this is the canvas
 *  observer for every structural op on the (single-field, inline) tags array. */
const canvasTags = (page: Page) => page.locator("[data-tag]").allTextContents();

/** Open the prop sheet for the Card containing the given heading, then expand
 *  the named array's disclosure. `Tags` is a single-field inline array; `Features`
 *  is a multi-field disclosure array. */
const openCardArray = async (
  page: Page,
  headingText: string,
  array: string,
) => {
  await page.getByText(headingText).click();
  await page.waitForTimeout(300);
  await climbToParent(page); // Heading → Card
  await clickToolbarAction(page, "edit");
  await page.waitForTimeout(400);
  expect(await toggleSheetDisclosure(page, array)).toBe(true);
  await page.waitForTimeout(200);
};

test.describe("Array field management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("add appends a defaultItemProps item — row value and canvas update", async ({
    page,
  }) => {
    await openCardArray(page, "MCP-Native", "Tags");

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
    await openCardArray(page, "MCP-Native", "Tags");

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
    await openCardArray(page, "Zero Chrome", "Tags");

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
    await openCardArray(page, "MCP-Native", "Tags");

    expect(await clickArrayRowAction(page, 1, "remove")).toBe(true);
    await page.waitForTimeout(300);

    const rows = await readArrayRows(page);
    expect(rows?.map((r) => r.summary)).toEqual(["Alpha"]);
    expect(await canvasTags(page)).toEqual(["Design", "Alpha"]);
  });

  test("removing via a real click keeps the sheet open (self-unmount race)", async ({
    page,
  }) => {
    await openCardArray(page, "MCP-Native", "Tags");

    // A real, trusted click on × used to bubble to the document selection
    // handler with a detached target and dismiss the whole sheet.
    expect(await realRemoveArrayRow(page, 1)).toBe(true);
    await page.waitForTimeout(300);

    expect(await isPropSheetOpen(page)).toBe(true);
    const rows = await readArrayRows(page);
    expect(rows?.map((r) => r.summary)).toEqual(["Alpha"]);
    expect(await canvasTags(page)).toEqual(["Design", "Alpha"]);
  });

  test("move buttons reorder — sheet and canvas order match, ends disabled", async ({
    page,
  }) => {
    await openCardArray(page, "MCP-Native", "Tags");

    const before = await readArrayRows(page);
    expect(before?.[0].up.disabled).toBe(true); // first row can't go up
    expect(before?.[0].up.reason).toBe("First item — can't move up");
    expect(before?.[1].down.disabled).toBe(true); // last row can't go down
    expect(before?.[1].down.reason).toBe("Last item — can't move down");

    expect(await clickArrayRowAction(page, 0, "down")).toBe(true);
    await page.waitForTimeout(300);

    const after = await readArrayRows(page);
    expect(after?.map((r) => r.summary)).toEqual(["Beta", "Alpha"]);
    expect(await canvasTags(page)).toEqual(["Design", "Beta", "Alpha"]);
  });

  test("structural ops land as separate history entries", async ({ page }) => {
    await openCardArray(page, "MCP-Native", "Tags");

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

  test("history labels name the moved/removed item", async ({ page }) => {
    await openCardArray(page, "MCP-Native", "Tags");

    expect(await clickArrayRowAction(page, 1, "remove")).toBe(true); // remove Beta
    await page.waitForTimeout(250);

    await hoverTimelineRail(page);
    await page.waitForTimeout(100);
    const dots = await readTimelineDots(page);
    await hoverTimelineDot(page, dots.length - 1); // newest entry
    await page.waitForTimeout(100);
    expect(await getTimelineTooltipText(page)).toBe("Remove 'Beta'");
  });

  // --- Multi-field disclosure rows (Features) ---

  test("multi-field rows collapse by default and expose a secondary detail", async ({
    page,
  }) => {
    await openCardArray(page, "MCP-Native", "Features");

    const rows = await readArrayRows(page);
    expect(
      rows?.map((r) => ({
        summary: r.summary,
        secondary: r.secondary,
        open: r.open,
      })),
    ).toEqual([
      { summary: "Fast", secondary: "Sub-second edits", open: false },
      { summary: "Secure", secondary: "Sandboxed drafts", open: false },
    ]);
  });

  test("expansion travels with a moved item (identity-keyed)", async ({
    page,
  }) => {
    await openCardArray(page, "MCP-Native", "Features");

    // Expand "Secure" (index 1), confirm its fields, then move it up.
    expect(await clickArrayRowAction(page, 1, "toggle")).toBe(true);
    await page.waitForTimeout(150);
    expect(await readArrayRowFields(page, 1)).toEqual([
      "Secure",
      "Sandboxed drafts",
    ]);

    expect(await clickArrayRowAction(page, 1, "up")).toBe(true);
    await page.waitForTimeout(250);

    const rows = await readArrayRows(page);
    expect(rows?.map((r) => ({ summary: r.summary, open: r.open }))).toEqual([
      { summary: "Secure", open: true },
      { summary: "Fast", open: false },
    ]);
    // Open-state and fields attached to Secure, now at index 0 — not to index 1.
    expect(await readArrayRowFields(page, 0)).toEqual([
      "Secure",
      "Sandboxed drafts",
    ]);
  });

  test("expansion stays on the right item when another is removed", async ({
    page,
  }) => {
    await openCardArray(page, "MCP-Native", "Features");

    // Expand "Fast" (index 0), then remove "Secure" (index 1).
    expect(await clickArrayRowAction(page, 0, "toggle")).toBe(true);
    await page.waitForTimeout(150);
    expect(await readArrayRowFields(page, 0)).toEqual([
      "Fast",
      "Sub-second edits",
    ]);

    expect(await clickArrayRowAction(page, 1, "remove")).toBe(true);
    await page.waitForTimeout(250);

    const rows = await readArrayRows(page);
    expect(rows?.map((r) => ({ summary: r.summary, open: r.open }))).toEqual([
      { summary: "Fast", open: true },
    ]);
    expect(await readArrayRowFields(page, 0)).toEqual([
      "Fast",
      "Sub-second edits",
    ]);
  });
});
