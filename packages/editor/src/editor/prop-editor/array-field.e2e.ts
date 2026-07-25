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
  isSheetVisible,
  selectElement,
  settle,
  openTestPage,
} from "../overlay/testing.js";

/** The array rows' summaries in order — the sheet-side observable every
 *  structural op (add / remove / move) writes to. */
const rowSummaries = (page: Page) =>
  readArrayRows(page).then((rows) => rows?.map((r) => r.summary) ?? null);

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
  await selectElement(page, page.getByText(headingText));
  await climbToParent(page); // Heading → Card
  await clickToolbarAction(page, "edit");
  await expect.poll(() => isSheetVisible(page)).toBe(true);
  await settle(page);
  expect(await toggleSheetDisclosure(page, array)).toBe(true);
  // The rows only exist once the disclosure is open — their arrival is the
  // expansion's observable.
  await expect
    .poll(() => readArrayRows(page).then((r) => r?.length ?? 0))
    .toBeGreaterThan(0);
};

test.describe("Array field management", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("add appends a defaultItemProps item — row value and canvas update", async ({
    page,
  }) => {
    await openCardArray(page, "MCP-Native", "Tags");

    const before = await readArrayRows(page);
    expect(before?.map((r) => r.summary)).toEqual(["Alpha", "Beta"]);

    expect(await clickArrayAdd(page)).toBe(true);
    await expect
      .poll(() => rowSummaries(page))
      .toEqual(["Alpha", "Beta", "New tag"]);

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
    await expect.poll(() => readArrayRows(page).then((r) => r?.length)).toBe(3);
    await settle(page);
    expect(await clickArrayAdd(page)).toBe(true);
    await expect.poll(() => readArrayRows(page).then((r) => r?.length)).toBe(4);

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
    await expect.poll(() => rowSummaries(page)).toEqual(["Alpha"]);

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
    // Wait on the removal itself, not on "sheet still open" — that would pass
    // instantly whether or not the click landed.
    await expect.poll(() => rowSummaries(page)).toEqual(["Alpha"]);

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
    await expect.poll(() => rowSummaries(page)).toEqual(["Beta", "Alpha"]);

    const after = await readArrayRows(page);
    expect(after?.map((r) => r.summary)).toEqual(["Beta", "Alpha"]);
    expect(await canvasTags(page)).toEqual(["Design", "Beta", "Alpha"]);
  });

  test("structural ops land as separate history entries", async ({ page }) => {
    await openCardArray(page, "MCP-Native", "Tags");

    expect(await clickArrayAdd(page)).toBe(true);
    await expect
      .poll(() => rowSummaries(page))
      .toEqual(["Alpha", "Beta", "New tag"]);
    await settle(page);
    expect(await clickArrayRowAction(page, 0, "down")).toBe(true);
    await expect
      .poll(() => canvasTags(page))
      .toEqual(["Design", "Beta", "Alpha", "New tag"]);

    // Close the sheet, then undo twice: one entry per op, not one coalesced.
    // settle() between each keypress — an assertion resolves mid-commit, and a
    // key fired there corrupts the history future the next undo reads.
    await settle(page);
    await page.keyboard.press("Escape");
    await expect.poll(() => isPropSheetOpen(page)).toBe(false);
    await settle(page);
    await page.keyboard.press("Meta+z");
    await expect
      .poll(() => canvasTags(page))
      .toEqual(["Design", "Alpha", "Beta", "New tag"]);
    await settle(page);
    await page.keyboard.press("Meta+z");
    await expect
      .poll(() => canvasTags(page))
      .toEqual(["Design", "Alpha", "Beta"]);
  });

  test("history labels name the moved/removed item", async ({ page }) => {
    await openCardArray(page, "MCP-Native", "Tags");

    expect(await clickArrayRowAction(page, 1, "remove")).toBe(true); // remove Beta
    await expect.poll(() => rowSummaries(page)).toEqual(["Alpha"]);

    await settle(page);
    await hoverTimelineRail(page);
    // The rail paints its dots on hover — wait for them, not for a fixed delay.
    await expect
      .poll(() => readTimelineDots(page).then((d) => d.length), {
        intervals: [50],
      })
      .toBeGreaterThan(0);
    const dots = await readTimelineDots(page);
    await hoverTimelineDot(page, dots.length - 1); // newest entry
    await expect
      .poll(() => getTimelineTooltipText(page), { intervals: [50] })
      .toBe("Remove 'Beta'");
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
    await expect
      .poll(() => readArrayRowFields(page, 1))
      .toEqual(["Secure", "Sandboxed drafts"]);

    await settle(page);
    expect(await clickArrayRowAction(page, 1, "up")).toBe(true);
    await expect.poll(() => rowSummaries(page)).toEqual(["Secure", "Fast"]);

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
    await expect
      .poll(() => readArrayRowFields(page, 0))
      .toEqual(["Fast", "Sub-second edits"]);

    await settle(page);
    expect(await clickArrayRowAction(page, 1, "remove")).toBe(true);
    await expect.poll(() => rowSummaries(page)).toEqual(["Fast"]);

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
