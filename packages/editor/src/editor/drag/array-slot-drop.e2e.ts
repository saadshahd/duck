import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  dispatchDrag,
  draggablePressPoint,
  sourceCenter,
  getActiveDestinationLabel,
  type Point,
openTestPage,
} from "../overlay/testing.js";

/** Ticket 114 slice 4 + folded 117: drop INTO array-item slots — a slot that
 *  lives at `items[i].content`, not a top-level prop. The fixture's `Sections`
 *  component has two array items: the first carries a filled `content` slot, the
 *  second an EMPTY `content: []` (the dead-space case). Sections renders below
 *  the fold, so each test scrolls it into view; sources are chosen adjacent to
 *  it (the banner just above) so both drag endpoints sit in the viewport for
 *  `document.elementFromPoint`. */
test.describe("Drop into array-item slots", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
    await sections(page).scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
  });

  const sections = (page: Page): Locator =>
    page.locator('[data-testid="sections"]');
  const sectionAt = (page: Page, i: number): Locator =>
    sections(page).locator("[data-section]").nth(i);
  const childTags = (loc: Locator): Promise<string[]> =>
    loc.evaluate((el) => [...el.children].map((c) => c.tagName));

  const banner = (page: Page): Locator =>
    page.getByText("Heads up", { exact: false });
  const nestedChild = (page: Page): Locator =>
    page.getByText("Nested content inside an array-item slot.");

  /** Center of the nested text child that anchors the first array item's
   *  measured slot band. */
  const filledSlotPoint = async (page: Page): Promise<Point> =>
    sourceCenter(nestedChild(page));

  /** Press the source and glide over waypoints without releasing (live drag),
   *  so the overlay resolves and paints at each point. */
  const mouseDrag = async (
    page: Page,
    source: Locator,
    waypoints: readonly Point[],
    release: boolean,
  ) => {
    const start = await draggablePressPoint(source);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const wp of waypoints) {
      await page.mouse.move(wp.x, wp.y, { steps: 8 });
      await page.waitForTimeout(60);
    }
    if (release) await page.mouse.up();
  };

  /** Tap Shift once during a live drag to step the destination cycle; the
   *  key-up 1px nudge re-arms the next rising edge (Chromium emits no dragover
   *  for a modifier-only change). */
  const tapShift = async (page: Page, at: Point) => {
    await page.keyboard.down("Shift");
    await page.mouse.move(at.x + 1, at.y, { steps: 1 });
    await page.waitForTimeout(120);
    await page.keyboard.up("Shift");
    await page.mouse.move(at.x, at.y, { steps: 1 });
    await page.waitForTimeout(80);
  };

  test("drop into a filled array-item slot lands the child inside that item", async ({
    page,
  }) => {
    const before = (await childTags(sectionAt(page, 0))).length;

    await banner(page).click();
    await page.waitForTimeout(300);

    await dispatchDrag(page, {
      from: await sourceCenter(banner(page)),
      to: await filledSlotPoint(page),
      phase: "full",
    });
    await page.waitForTimeout(500);

    // The child lands in item 0's filled slot, not item 1's empty one.
    expect((await childTags(sectionAt(page, 0))).length).toBe(before + 1);
    expect(await childTags(sectionAt(page, 1))).toEqual(["H4"]);
  });

  test("drop into the EMPTY array-item slot (117 dead-space) via the cycle", async ({
    page,
  }) => {
    // Before: item 0's slot has [heading, text child]; item 1's slot is empty
    // (only its <h4> heading renders). The empty slot's carved band hides behind
    // that unregistered <h4>, so it is reached through the destination cycle.
    const item0Before = (await childTags(sectionAt(page, 0))).length;
    expect(await childTags(sectionAt(page, 1))).toEqual(["H4"]);

    await banner(page).click();
    await page.waitForTimeout(300);

    const at = await sourceCenter(sections(page));
    await mouseDrag(page, banner(page), [at], false);

    // Both array-item content slots enumerate as "Sections › content", deepest
    // first. The cycle activates at index 0 (items[0].content); a second step
    // lands on index 1 — items[1].content, the empty slot.
    await tapShift(page, at); // index 0 → items[0].content
    await tapShift(page, at); // index 1 → items[1].content (empty)
    expect(await getActiveDestinationLabel(page)).toBe("Sections › content");
    await page.mouse.up();
    await page.waitForTimeout(500);

    // The child landed in the empty item 1, leaving item 0 untouched.
    expect((await childTags(sectionAt(page, 1))).length).toBeGreaterThan(1);
    expect((await childTags(sectionAt(page, 0))).length).toBe(item0Before);
  });
});
