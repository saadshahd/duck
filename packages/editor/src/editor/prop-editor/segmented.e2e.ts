import { test, expect } from "@playwright/test";
import {
  clickToolbarAction,
  isSheetVisible,
  readSegmentedItems,
  focusFirstSegmentedItem,
  getSegmentedRole,
  getSegmentedItemCenter,
openTestPage,
} from "../overlay/testing.js";

/**
 * T4 observer: segmented control (Ark SegmentGroup) renders correctly inside the
 * editor's open shadow root. Verified against Heading.level (H1/H2/H3/H4) —
 * a top-level select field with metadata: { control: "segmented" }.
 *
 * Observer O1 contract: role="radiogroup" at root, single-select, keyboard-
 * navigable, reflects stored value, persists across close/reopen.
 */

const openHeadingSheet = async (page: import("@playwright/test").Page) => {
  await page.locator("h1").click();
  await page.waitForTimeout(200);
  await clickToolbarAction(page, "edit");
  await page.waitForTimeout(400);
};

test.describe("Segmented control — Heading.level (T4)", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  // O1a: root has role="radiogroup" — the ARIA contract for single-select keyboard group.
  test("O1a: segmented root has role=radiogroup in the shadow root", async ({
    page,
  }) => {
    await openHeadingSheet(page);
    expect(await isSheetVisible(page)).toBe(true);

    // Scope to "level" so the T8 always-open style section's textAlign segmented
    // control does not interfere (Heading now has two segmented controls on screen).
    expect(await getSegmentedRole(page, "Level")).toBe("radiogroup");
  });

  // O1b: renders one segment per option (H1/H2/H3/H4) and the stored value ("h1"
  //      — the page's top-level heading is an h1) is the selected segment.
  test("O1b: renders all options and reflects stored value", async ({
    page,
  }) => {
    await openHeadingSheet(page);

    // Scope to "level": after T8 the style section is always-open, so textAlign
    // (also segmented, 4 options) is also rendered — global query would return 8 items.
    const items = await readSegmentedItems(page, "Level");
    expect(items).not.toBeNull();
    // 4 segments for H1/H2/H3/H4
    expect(items!.length).toBe(4);
    // Values match the option values
    expect(items!.map((i) => i.value)).toEqual(["h1", "h2", "h3", "h4"]);
    // The page's top-level heading has level="h1" — that segment is checked.
    const selected = items!.filter((i) => i.checked);
    expect(selected.length).toBe(1);
    expect(selected[0].value).toBe("h1");
  });

  // O1c: keyboard nav — Arrow keys move focus and selection within the shadow root.
  test("O1c: keyboard nav moves focus and selection inside shadow root", async ({
    page,
  }) => {
    await openHeadingSheet(page);

    // Focus the first item of the "level" field (not textAlign's first item).
    const focused = await focusFirstSegmentedItem(page, "Level");
    expect(focused).toBe(true);

    // ArrowRight moves selection and focus to the next item.
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(100);

    const afterRight = await readSegmentedItems(page, "Level");
    expect(afterRight).not.toBeNull();
    const focusedItem = afterRight!.find((i) => i.focused);
    // Focus moved to h2 (the second item).
    expect(focusedItem?.value).toBe("h2");

    // Single-select: arrow nav in a radiogroup moves selection too — exactly one
    // segment is checked, and it is the now-focused h2.
    const selectedAfterRight = afterRight!.filter((i) => i.checked);
    expect(selectedAfterRight.length).toBe(1);
    expect(selectedAfterRight[0].value).toBe("h2");

    // ArrowLeft wraps back to h1.
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(100);
    const afterLeft = await readSegmentedItems(page, "Level");
    const focusedLeft = afterLeft!.find((i) => i.focused);
    expect(focusedLeft?.value).toBe("h1");
  });

  // O1e (audit F13): an UNSET segmented field must still render the framed control
  //   (radiogroup + one segment per option) in a neutral none-selected state — never
  //   collapse to run-together bare text. The hero h1 has no style.textAlign, so its
  //   "Text align" control is unset while "Level" (h1) is set — proving the frame is
  //   value-independent, not a side effect of having a selection.
  test("O1e: unset segmented renders a framed, none-selected control", async ({
    page,
  }) => {
    await openHeadingSheet(page);
    expect(await isSheetVisible(page)).toBe(true);

    // Frame present: the root is a radiogroup even with nothing selected.
    expect(await getSegmentedRole(page, "Text align")).toBe("radiogroup");

    // Every option is rendered as a segment, and none is checked (honest empty).
    const items = await readSegmentedItems(page, "Text align");
    expect(items).not.toBeNull();
    expect(items!.map((i) => i.value)).toEqual([
      "left",
      "center",
      "right",
      "justify",
    ]);
    expect(items!.filter((i) => i.checked).length).toBe(0);
  });

  // O1d: selecting a different segment, closing, and reopening retains the choice.
  test("O1d: selected value persists across Escape close and reopen", async ({
    page,
  }) => {
    await openHeadingSheet(page);

    // Click the H3 segment with a REAL mouse click at its viewport center —
    // synthetic .click() can mask self-unmount races (project memory). This is
    // the selection pattern T5/T6 copy. Scope to "level" so we click the right group.
    const h3Center = await getSegmentedItemCenter(page, "h3", "Level");
    expect(h3Center).not.toBeNull();
    await page.mouse.click(h3Center!.x, h3Center!.y);
    await page.waitForTimeout(200);

    // Close via Escape.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    expect(await isSheetVisible(page)).toBe(false);

    // Reopen.
    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(400);

    // The h3 segment must now be selected.
    const items = await readSegmentedItems(page, "Level");
    expect(items).not.toBeNull();
    const selected = items!.filter((i) => i.checked);
    expect(selected.length).toBe(1);
    expect(selected[0].value).toBe("h3");
  });
});
