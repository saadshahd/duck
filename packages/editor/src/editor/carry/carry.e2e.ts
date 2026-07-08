import { test, expect, type Page } from "@playwright/test";
import {
  countHighlights,
  getTileLabels,
  readTileRects,
  getActiveDestinationLabel,
  isToolbarVisible,
  isLiftPulseVisible,
  getLiftPulseRect,
  isNoTargetFlashVisible,
  getCycleChipText,
  waitFrames,
  type Point,
} from "../overlay/testing.js";

const cardTitle = (page: Page) => page.locator('h3:has-text("Zero Chrome")');
const card = (page: Page) => cardTitle(page).locator("..");

/** Point in the gap below the card title — over the Card's header slot band. */
const headerGapPoint = async (page: Page): Promise<Point> => {
  const title = await cardTitle(page).boundingBox();
  const cardBox = await card(page).boundingBox();
  if (!title || !cardBox) throw new Error("Card not visible");
  return { x: cardBox.x + cardBox.width / 2, y: title.y + title.height + 2 };
};

const cardTags = (page: Page) =>
  card(page).evaluate((el) => [...el.children].map((c) => c.tagName));

const lift = async (page: Page) => {
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
};

test.describe("Carry (pointer-driven move)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  test("Space lifts; clicking a slot band moves the element into it", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);
    expect(await isToolbarVisible(page)).toBe(true);

    await lift(page);

    const gap = await headerGapPoint(page);
    await page.mouse.move(gap.x, gap.y);
    await expect
      .poll(async () => (await getTileLabels(page))?.[0] ?? null)
      .toBe("Card › header");

    await page.mouse.click(gap.x, gap.y);

    await expect
      .poll(async () => (await cardTags(page)).slice(0, 2))
      .toEqual(["H3", "H1"]);
  });

  test("Space lift, arrow step, Enter commits", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await lift(page);

    const gap = await headerGapPoint(page);
    await page.mouse.move(gap.x, gap.y);
    await expect
      .poll(() => getActiveDestinationLabel(page))
      .toBe("Card › header");

    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(80);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(120);
    expect(await getActiveDestinationLabel(page)).toBe("Card › body");

    await page.keyboard.press("Enter");

    await expect.poll(() => cardTags(page)).toContain("H1");
  });

  test("first ArrowDown after Space-lift moves the indicator (no pointer move in between)", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await lift(page);

    // No mouse movement at all between lift and the first ArrowDown — the
    // hands-on-keyboard path the bug report describes. The preview already
    // shows the lift-seeded destination; the very first press must move off
    // of it, not silently re-confirm the same one.
    const before = await getActiveDestinationLabel(page);
    expect(before).not.toBeNull();

    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(80);
    const after = await getActiveDestinationLabel(page);

    expect(after).not.toBeNull();
    expect(after).not.toBe(before);

    await page.keyboard.press("Escape");
  });

  test("Esc cancels: element unmoved and still selected", async ({ page }) => {
    const heading = page.locator("h1");
    const heroSection = heading.locator("..");
    const before = await heroSection.locator("> *").first().textContent();

    await heading.click();
    await page.waitForTimeout(300);
    expect(await countHighlights(page)).toBe(1);

    await lift(page);

    const gap = await headerGapPoint(page);
    await page.mouse.move(gap.x, gap.y);
    await page.waitForTimeout(120);

    await page.keyboard.press("Escape");

    await expect
      .poll(() => heroSection.locator("> *").first().textContent())
      .toBe(before);
    expect(await countHighlights(page)).toBe(1);
  });
});

test.describe("Carry affordances", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  test("action-move button no longer exists in the toolbar", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);
    expect(await isToolbarVisible(page)).toBe(true);

    const hasOldButton = await page.evaluate(() => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        return (
          d.shadowRoot.querySelector(
            "[role='toolbar'] [data-role='action-move']",
          ) !== null
        );
      }
      return false;
    });
    expect(hasOldButton).toBe(false);
  });

  test("Space lift enters carrying mode: slot tiles visible and body cursor is move", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await lift(page);

    // Slot tiles appear when carrying
    await expect.poll(() => getTileLabels(page)).not.toBeNull();
    const tiles = await getTileLabels(page);
    expect(tiles && tiles.length > 0).toBe(true);

    // Body cursor is move
    const cursor = await page.evaluate(() => document.body.style.cursor);
    expect(cursor).toBe("move");
  });

  test("lift pulse appears when carrying starts", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await lift(page);

    expect(await isLiftPulseVisible(page)).toBe(true);
  });

  test("clicking void area while carrying shows no-target flash then clears; still carrying", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await lift(page);

    // Move pointer to a void area (top-left corner — outside all page elements).
    // Wait for the rAF callbacks to fire and settle selected=null before clicking.
    await page.mouse.move(5, 5);
    await waitFrames(page, 3);

    // Click — should trigger no-target flash (no valid destination at corner)
    await page.mouse.click(5, 5);

    // Flash should appear
    await expect.poll(() => isNoTargetFlashVisible(page)).toBe(true);

    // Flash should disappear after ~300ms
    await expect
      .poll(() => isNoTargetFlashVisible(page), { timeout: 1000 })
      .toBe(false);

    // Still carrying: the pointer sits over a void corner, so the continuous
    // no-target signal makes the body cursor "not-allowed" — a carry cursor, not
    // the default it is restored to on carry exit. That it is one of carry's two
    // cursor states (not the restored "") is the clearest proof carry persists.
    const cursor = await page.evaluate(() => document.body.style.cursor);
    expect(cursor).toBe("not-allowed");
  });

  test("Esc cancels carry: cursor restored", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await lift(page);

    expect(await page.evaluate(() => document.body.style.cursor)).toBe("move");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    const cursor = await page.evaluate(() => document.body.style.cursor);
    expect(cursor).not.toBe("move");
    expect(await countHighlights(page)).toBe(1);
  });

  test("lift pulse overlaps the source element after the page is scrolled", async ({
    page,
  }) => {
    // Scroll the page so the source sits at a non-zero scroll offset — a
    // viewport-vs-document coordinate bug would render the pulse scrollY px off.
    // The "Zero Chrome" card title stays in the viewport at this scroll.
    await page.evaluate(() => window.scrollTo(0, 300));
    await waitFrames(page, 2);

    const title = cardTitle(page);
    const box = await title.boundingBox();
    if (!box) throw new Error("Card title not visible after scroll");

    // Select via raw pointer coords so Playwright never auto-scrolls the page back.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    // Lift via Space (keyboard never re-scrolls), keeping the scroll offset intact.
    await lift(page);

    const pulse = await getLiftPulseRect(page);
    const source = await title.boundingBox();
    expect(pulse).not.toBeNull();
    expect(source).not.toBeNull();

    // The pulse must sit over the source's viewport box, not scrollDelta px off.
    const overlaps =
      pulse!.x < source!.x + source!.width &&
      pulse!.x + pulse!.width > source!.x &&
      pulse!.y < source!.y + source!.height &&
      pulse!.y + pulse!.height > source!.y;
    expect(overlaps).toBe(true);

    await page.keyboard.press("Escape");
  });
});

test.describe("Carry tracks scroll", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  test("scroll mid-carry re-resolves every affordance in lockstep — pulse, tiles, and active label all follow the new geometry", async ({
    page,
  }) => {
    // Lift the heading via Space so no auto-scroll perturbs the page offset.
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);
    await lift(page);

    // Aim mid-Card-body — deep inside a tall band, clear of its boundaries — so a
    // moderate scroll keeps the SAME destination under the fixed viewport pointer.
    // A boundary-grazing aim would flip the named slot on the first pixel of
    // scroll (correct re-aiming, but it would mask the lockstep this test pins).
    const cardBox = await card(page).boundingBox();
    if (!cardBox) throw new Error("Card not visible");
    const aim = {
      x: cardBox.x + cardBox.width / 2,
      y: cardBox.y + cardBox.height * 0.55,
    };
    await page.mouse.move(aim.x, aim.y);
    await expect
      .poll(() => getActiveDestinationLabel(page))
      .toBe("Card › body");

    // Snapshot all carry affordances before the scroll.
    const pulseBefore = await getLiftPulseRect(page);
    const tilesBefore = await readTileRects(page);
    const labelBefore = await getActiveDestinationLabel(page);
    const sourceBefore = await heading.boundingBox();
    expect(pulseBefore).not.toBeNull();
    expect(tilesBefore && tilesBefore.length > 0).toBe(true);
    expect(sourceBefore).not.toBeNull();

    // The pulse rides the source's viewport box before the scroll.
    const overlapsSource = (
      pulse: { x: number; y: number; width: number; height: number },
      src: { x: number; y: number; width: number; height: number },
    ) =>
      pulse.x < src.x + src.width &&
      pulse.x + pulse.width > src.x &&
      pulse.y < src.y + src.height &&
      pulse.y + pulse.height > src.y;
    expect(overlapsSource(pulseBefore!, sourceBefore!)).toBe(true);

    // Wheel 50px without moving the pointer. The viewport point is unchanged; the
    // content beneath it scrolls up 50px while staying inside the same body band.
    const SCROLL = 50;
    await page.mouse.wheel(0, SCROLL);
    // Re-resolution must land in the same frame as the scroll — give it two
    // frames to flush, but never a pointer move (that would mask a stale window).
    await waitFrames(page, 2);

    const pulseAfter = await getLiftPulseRect(page);
    const tilesAfter = await readTileRects(page);
    const labelAfter = await getActiveDestinationLabel(page);
    const sourceAfter = await heading.boundingBox();
    expect(pulseAfter).not.toBeNull();
    expect(tilesAfter && tilesAfter.length > 0).toBe(true);
    expect(sourceAfter).not.toBeNull();

    const sourceShift = sourceBefore!.y - sourceAfter!.y;

    // 1. Lift pulse tracked: it still overlaps the source's NEW viewport box, and
    //    it shifted up by exactly the source's scroll delta — not frozen at stale
    //    coords, not lagging behind the tiles.
    expect(overlapsSource(pulseAfter!, sourceAfter!)).toBe(true);
    const pulseShift = pulseBefore!.y - pulseAfter!.y;
    expect(Math.abs(pulseShift - sourceShift)).toBeLessThan(4);
    expect(pulseShift).toBeGreaterThan(20);

    // 2. Tiles re-resolved in lockstep: every painted tile's top edge shifted up
    //    by the same scroll delta the source did. A partial (frozen-tile) update
    //    would leave tiles at their pre-scroll y.
    const tileShift = (tilesBefore![0]?.top ?? 0) - (tilesAfter![0]?.top ?? 0);
    expect(Math.abs(tileShift - sourceShift)).toBeLessThan(4);
    expect(tileShift).toBeGreaterThan(20);

    // 3. Active label re-resolved through the same path — the pointer stayed deep
    //    in the body band, so the destination beneath it resolves to the SAME
    //    slot. A broken re-resolution emitting any other non-null label would slip
    //    past a mere not-null check.
    expect(labelBefore).not.toBeNull();
    expect(labelAfter).toBe(labelBefore);

    await page.keyboard.press("Escape");
  });
});

test.describe("Carry cycle chip", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  test("cycle chip is present at carry entry showing the ⇥ cycle hint", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    // R12: the chip is the entire grammar disclosure — it appears at carry entry,
    // before any Tab step, naming the cycle key for this modality.
    await lift(page);

    expect(await getCycleChipText(page)).toBe("⇥ to cycle");

    await page.keyboard.press("Escape");
  });

  test("Tab step switches the cycle chip from the hint to N of M", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await lift(page);

    // Entry hint before stepping.
    expect(await getCycleChipText(page)).toBe("⇥ to cycle");

    const gap = await headerGapPoint(page);
    await page.mouse.move(gap.x, gap.y);
    await page.waitForTimeout(80);

    await page.keyboard.press("Tab");
    await page.waitForTimeout(80);

    const chip = await getCycleChipText(page);
    expect(chip).not.toBeNull();
    // Format: "N of M" where both N and M are positive integers.
    expect(chip).toMatch(/^\d+ of \d+$/);

    await page.keyboard.press("Escape");
  });

  test("Tab steps forward through destinations; Shift+Tab steps back", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await lift(page);

    const gap = await headerGapPoint(page);
    await page.mouse.move(gap.x, gap.y);
    await page.waitForTimeout(80);

    // First Tab — anchors at the hovered tile.
    await page.keyboard.press("Tab");
    await page.waitForTimeout(80);
    const labelAfterFirst = await getActiveDestinationLabel(page);

    // Second Tab — advances one step.
    await page.keyboard.press("Tab");
    await page.waitForTimeout(80);
    const labelAfterSecond = await getActiveDestinationLabel(page);

    // Shift+Tab — reverses one step, returning to the first label.
    await page.keyboard.press("Shift+Tab");
    await page.waitForTimeout(80);
    const labelAfterBack = await getActiveDestinationLabel(page);

    expect(labelAfterBack).toBe(labelAfterFirst);
    // The two forward steps must have landed on different destinations.
    expect(labelAfterFirst).not.toBe(labelAfterSecond);

    await page.keyboard.press("Escape");
  });

  test("Tab calls preventDefault — focus never leaves the overlay", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await lift(page);

    const gap = await headerGapPoint(page);
    await page.mouse.move(gap.x, gap.y);
    await page.waitForTimeout(80);

    // Record the focused element before Tab.
    const focusBefore = await page.evaluate(
      () => document.activeElement?.tagName ?? "BODY",
    );

    await page.keyboard.press("Tab");
    await page.waitForTimeout(80);

    // Focus must not have moved to a different native element.
    const focusAfter = await page.evaluate(
      () => document.activeElement?.tagName ?? "BODY",
    );
    expect(focusAfter).toBe(focusBefore);

    await page.keyboard.press("Escape");
  });

  test("Tab cycle reaches sibling cards' slots — full keyboard reach parity", async ({
    page,
  }) => {
    // A card region keyed off any h3 title — mirrors the file's `card()` helper.
    const cardByTitle = (title: string) =>
      page.locator(`h3:has-text("${title}")`).locator("..");

    type Rect = { top: number; left: number; bottom: number; right: number };
    const intersects = (a: Rect, b: Rect) =>
      a.left < b.right &&
      a.right > b.left &&
      a.top < b.bottom &&
      a.bottom > b.top;

    const toRect = (box: {
      x: number;
      y: number;
      width: number;
      height: number;
    }): Rect => ({
      top: box.y,
      left: box.x,
      bottom: box.y + box.height,
      right: box.x + box.width,
    });

    // Select the "Zero Chrome" h3 (feature-1's header), lift, aim over its card.
    await cardTitle(page).click();
    await page.waitForTimeout(300);

    await lift(page);

    const gap = await headerGapPoint(page);
    await page.mouse.move(gap.x, gap.y);
    await expect.poll(() => getActiveDestinationLabel(page)).not.toBeNull();

    // First Tab anchors the cycle and reveals M.
    await page.keyboard.press("Tab");
    await expect.poll(() => getCycleChipText(page)).toMatch(/^\d+ of \d+$/);
    const firstChip = await getCycleChipText(page);
    const total = Number(firstChip!.split(" of ")[1]);

    // Walk the full cycle: Tab M times, recording label + painted tile rects.
    const steps = await Array.fromAsync(
      Array.from({ length: total }),
      async () => {
        await page.keyboard.press("Tab");
        await page.waitForTimeout(60);
        return {
          label: await getActiveDestinationLabel(page),
          tiles: await readTileRects(page),
        };
      },
    );

    const feature2 = toRect((await cardByTitle("MCP-Native").boundingBox())!);
    const feature3 = toRect(
      (await cardByTitle("Catalog-Agnostic").boundingBox())!,
    );

    const hits = (card: Rect) =>
      steps.some((s) => (s.tiles ?? []).some((t) => intersects(t, card)));

    // 1. M is large enough to enumerate sibling slots, not just feature-1's own.
    expect(total).toBeGreaterThanOrEqual(6);

    // 2. Geometry — labels are type-qualified ("Card › header") so sibling cards
    //    are indistinguishable by text. Some step must paint tiles inside each
    //    sibling card's bounding box.
    expect(hits(feature2)).toBe(true);
    expect(hits(feature3)).toBe(true);

    // 3. Cancel the carry.
    await page.keyboard.press("Escape");
  });

  test("cycle chip disappears after Esc cancels carry", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    await lift(page);

    const gap = await headerGapPoint(page);
    await page.mouse.move(gap.x, gap.y);
    await page.waitForTimeout(80);

    await page.keyboard.press("Tab");
    await page.waitForTimeout(80);

    // Chip visible after Tab.
    expect(await getCycleChipText(page)).not.toBeNull();

    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    // Chip gone after cancel.
    expect(await getCycleChipText(page)).toBeNull();
  });
});
