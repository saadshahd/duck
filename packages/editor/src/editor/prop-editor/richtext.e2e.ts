import { test, expect, type Page } from "@playwright/test";
import {
  clickToolbarAction,
  climbToParent,
  focusRichText,
  readRichTextActions,
  readRichTextActiveActions,
  clickRichTextAction,
} from "../overlay/testing.js";

/** Longer than CONTINUOUS_DEBOUNCE_MS (300) — waits out one continuous commit. */
const DEBOUNCE = 450;

/** ProseMirror observes DOM selection changes into its own state asynchronously,
 *  so a keyboard selection isn't reflected in the state a toolbar command reads
 *  until the next tick. A real designer's pointer never outruns this; an instant
 *  E2E does, so it settles before formatting. */
const SELECTION_SYNC = 300;

/** The demo Card renders its `note` richtext prop as a [data-note] block, so
 *  this is the canvas observer for what the control has committed as stored HTML. */
const noteHtml = (page: Page) =>
  page.locator("[data-note]").first().innerHTML();
const noteCount = (page: Page) => page.locator("[data-note]").count();

/** Open the prop sheet for the Card holding the given heading. `note` is a
 *  primary richtext field, so nothing needs expanding once the sheet is open. */
const openCardNote = async (page: Page, headingText: string) => {
  await page.getByText(headingText).click();
  await page.waitForTimeout(300);
  await climbToParent(page); // Heading → Card
  await clickToolbarAction(page, "edit");
  await page.waitForTimeout(400);
};

test.describe("Richtext control", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  test("types content and bolds a range — stored as HTML, live on the canvas", async ({
    page,
  }) => {
    await openCardNote(page, "MCP-Native");

    // Honest toolbar: a bare richtext field offers the full formatting set.
    expect(await readRichTextActions(page)).toEqual([
      "bold",
      "italic",
      "strike",
      "heading",
      "bulletList",
      "orderedList",
    ]);

    expect(await focusRichText(page)).toBe(true);
    await page.keyboard.type("hello world");
    await page.waitForTimeout(DEBOUNCE);

    // Typing reaches the canvas as HTML through the continuous commit.
    expect(await noteHtml(page)).toContain("hello world");

    // Select the trailing word "world" (5 chars) and bold it.
    for (let i = 0; i < 5; i++) await page.keyboard.press("Shift+ArrowLeft");
    await page.waitForTimeout(SELECTION_SYNC);
    expect(await clickRichTextAction(page, "bold")).toBe(true);
    await page.waitForTimeout(DEBOUNCE);

    // Tiptap emits <strong> wrapping only the selected range; live on canvas.
    await expect(page.locator("[data-note] strong")).toHaveText("world");
    expect(await noteHtml(page)).toContain("<strong>world</strong>");
    expect(await page.locator("[data-note]").first().innerText()).toContain(
      "hello world",
    );

    // The toolbar reflects the active mark over the current selection.
    expect(await readRichTextActiveActions(page)).toContain("bold");
  });

  test("continuous commit — a typing burst lands once, one undo reverts it all", async ({
    page,
  }) => {
    await openCardNote(page, "MCP-Native");
    expect(await focusRichText(page)).toBe(true);

    // Type a burst faster than the debounce window.
    await page.keyboard.type("draft note", { delay: 20 });
    // Mid-burst the canvas has NOT committed — the control debounces rather than
    // writing per keystroke (the continuous CommitMode).
    expect(await noteCount(page)).toBe(0);

    await page.waitForTimeout(DEBOUNCE);
    expect(await noteHtml(page)).toContain("draft note");

    // Close the sheet, then a single undo reverts the whole coalesced burst —
    // the debounced commit produced one history entry, not one per keystroke.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(300);
    expect(await noteCount(page)).toBe(0);
  });
});
