import { test, expect } from "@playwright/test";
import {
  enterSlotChoice,
  isCatalogPickerVisible,
  isCatalogPickerFilterFocused,
  getActiveCatalogPickerItemType,
  getValidPickerItemTypes,
  getIncompatiblePickerItemTypes,
  countSelectionRings,
  getHighlightRect,
  pageContentCensus,
  focusIncompatiblePickerSummary,
  isIncompatiblePickerSectionOpen,
} from "../overlay/testing.js";

/** Insert picker keyboard flow: filter focused on open, Enter confirms the
 *  highlighted item, arrows move the highlight through valid items only, and
 *  no keystroke escapes the picker to a global shortcut or the canvas while
 *  it is open — identical on both the direct (sibling) route and the
 *  slot-choice route. */

test.describe("Insert picker — keyboard flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  test("direct route: filter is focused the instant the picker opens", async ({
    page,
  }) => {
    // A leaf (h1) selected directly routes to the sibling insert — no slot to
    // choose, "/" opens the picker in one action.
    await page.locator("h1").first().click();
    await page.waitForTimeout(300);
    await page.keyboard.press("/");
    await page.waitForTimeout(300);

    expect(await isCatalogPickerVisible(page)).toBe(true);
    expect(await isCatalogPickerFilterFocused(page)).toBe(true);
  });

  test("slot-choice route: filter is focused the instant the picker opens", async ({
    page,
  }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);
    await enterSlotChoice(page);
    await page.keyboard.press("/");
    await page.waitForTimeout(300);

    expect(await isCatalogPickerVisible(page)).toBe(true);
    expect(await isCatalogPickerFilterFocused(page)).toBe(true);
  });

  test("direct route: Enter inserts the highlighted (first, by default) item", async ({
    page,
  }) => {
    await page.locator("h1").first().click();
    await page.waitForTimeout(300);
    const censusBefore = await pageContentCensus(page);

    await page.keyboard.press("/");
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(true);
    expect(await getActiveCatalogPickerItemType(page)).not.toBeNull();

    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    // The insert wrote: picker closes, one new element is selected, and the
    // rendered document actually gained content.
    expect(await isCatalogPickerVisible(page)).toBe(false);
    expect(await countSelectionRings(page)).toBe(1);
    expect(await pageContentCensus(page)).not.toBe(censusBefore);
  });

  test("slot-choice route: Enter inserts the highlighted item identically", async ({
    page,
  }) => {
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);
    await enterSlotChoice(page);
    await page.keyboard.press("/");
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(true);

    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    expect(await isCatalogPickerVisible(page)).toBe(false);
    expect(await countSelectionRings(page)).toBe(1);
  });

  test("Escape closes the picker", async ({ page }) => {
    await page.locator("h1").first().click();
    await page.waitForTimeout(300);
    await page.keyboard.press("/");
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(true);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(false);
  });

  test("arrow navigation moves the highlight through valid items only, wraps, and skips the incompatible section", async ({
    page,
  }) => {
    // Card.header: Heading/Text are valid, Button sits in the collapsed
    // incompatible section — never a candidate for the highlight.
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);
    await enterSlotChoice(page);
    await page.keyboard.press("/");
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(true);

    const valid = await getValidPickerItemTypes(page);
    const incompatible = await getIncompatiblePickerItemTypes(page);
    expect(valid.length).toBeGreaterThanOrEqual(2);
    expect(incompatible).toContain("Button");

    // First item highlighted by default.
    expect(await getActiveCatalogPickerItemType(page)).toBe(valid[0]);

    // Walk ArrowDown through every valid item, one full cycle plus one extra
    // step — the extra step proves the wrap back to the first item, and every
    // step in between proves "Button" is never surfaced as the highlight.
    for (let i = 1; i <= valid.length; i++) {
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(100);
      const active = await getActiveCatalogPickerItemType(page);
      expect(active).toBe(valid[i % valid.length]);
      expect(active).not.toBe("Button");
    }

    // ArrowUp from the wrapped-to-first position steps back to the last item.
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(100);
    expect(await getActiveCatalogPickerItemType(page)).toBe(
      valid[valid.length - 1],
    );
  });

  test("Enter on the focused 'Incompatible' summary toggles the disclosure natively, not the picker's own Enter-confirms", async ({
    page,
  }) => {
    // Card.header has an incompatible section (Button) to disclose.
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);
    await enterSlotChoice(page);
    await page.keyboard.press("/");
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(true);
    expect(await isIncompatiblePickerSectionOpen(page)).toBe(false);

    const censusBefore = await pageContentCensus(page);

    // Focus (not click) the summary, then a real, trusted Enter keypress —
    // the picker's containment must not preventDefault this one; the browser's
    // native disclosure toggle should fire.
    await focusIncompatiblePickerSummary(page);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);

    expect(await isIncompatiblePickerSectionOpen(page)).toBe(true);
    // Still contained: picker stays open, nothing inserted, no global leak.
    expect(await isCatalogPickerVisible(page)).toBe(true);
    expect(await pageContentCensus(page)).toBe(censusBefore);

    // A second Enter toggles it closed again — proves it's the native
    // disclosure round-tripping, not a one-shot side effect.
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    expect(await isIncompatiblePickerSectionOpen(page)).toBe(false);
  });

  test("no keystroke leaks past the picker to a global shortcut or the canvas", async ({
    page,
  }) => {
    await page.locator("h1").first().click();
    await page.waitForTimeout(300);
    const ringBefore = await getHighlightRect(page);
    const censusBefore = await pageContentCensus(page);

    await page.keyboard.press("/");
    await page.waitForTimeout(300);
    expect(await isCatalogPickerVisible(page)).toBe(true);

    // Arrow keys: globally bound to move the DOCUMENT selection
    // (keyboard/use-keyboard.ts arrowBindings, unguarded by isEditable). While
    // the picker is open they must only move the picker's own highlight —
    // the underlying selection ring must not move a pixel.
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(100);
    expect(await getHighlightRect(page)).toEqual(ringBefore);

    // Duplicate ($mod+d): globally bound in clipboardBindings, guarded only by
    // `notEditing` (pointer !== "editing") — "inserting" passes that guard, so
    // without containment this would duplicate the selected element while the
    // user is simply typing "d" into the filter.
    await page.keyboard.press("Control+d");
    await page.keyboard.press("Meta+d");
    await page.waitForTimeout(100);
    expect(await pageContentCensus(page)).toBe(censusBefore);

    // Undo ($mod+z): globally bound, would rewrite history mid-typing.
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(100);
    expect(await pageContentCensus(page)).toBe(censusBefore);

    // The picker is still open and still focused throughout — none of the
    // above closed it or stole focus.
    expect(await isCatalogPickerVisible(page)).toBe(true);
    expect(await isCatalogPickerFilterFocused(page)).toBe(true);
  });
});
