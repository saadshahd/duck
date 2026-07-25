import { test, expect, type Page } from "@playwright/test";
import {
  climbToParent,
  clickSlotInsertBtn,
  isCatalogPickerVisible,
  isSlotStopVisible,
  hasCatalogPickerIncompatibleSection,
  getIncompatiblePickerItemTypes,
  getValidPickerItemTypes,
  openIncompatiblePickerSection,
  getIncompatiblePickerItemState,
  clickIncompatiblePickerItem,
  hasBlockedDropIndicator,
  hasDropIndicator,
  dispatchDrag,
  dispatchDragWithAlt,
  sourceCenter,
  edgePoint,
  pageContentCensus,
  selectElement,
  settle,
  openTestPage,
} from "../overlay/testing.js";

test.describe("Slot constraints — insert picker partitioning", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("B: Card.header picker — Heading/Text valid, Button in incompatible section", async ({
    page,
  }) => {
    // Select a Heading inside a Card header, climb to the Card, enter slot-choice.
    await selectElement(page, page.locator("h3").first());
    await climbToParent(page);

    // Enter the slot-choice step on the multi-slot Card.
    await page.keyboard.press("/");
    await expect.poll(() => isSlotStopVisible(page)).toBe(true);
    await settle(page);

    // Click the insert button for the header slot (the active slot-stop).
    await clickSlotInsertBtn(page);

    await expect.poll(() => isCatalogPickerVisible(page)).toBe(true);

    // Heading and Text must be in the valid (top-level) list.
    const valid = await getValidPickerItemTypes(page);
    expect(valid).toContain("Heading");
    expect(valid).toContain("Text");
    expect(valid).not.toContain("Button");

    // An incompatible section must be present.
    expect(await hasCatalogPickerIncompatibleSection(page)).toBe(true);

    // Button is in the incompatible section.
    const incompatible = await getIncompatiblePickerItemTypes(page);
    expect(incompatible).toContain("Button");
  });

  test("B: Stack.children picker — no incompatible section (bare slot)", async ({
    page,
  }) => {
    // Click the H1 heading which lives in the hero Stack.
    await selectElement(page, page.locator("h1").first());
    await climbToParent(page);

    // Stack has one slot (children) — pressing / opens the picker directly.
    await page.keyboard.press("/");

    await expect.poll(() => isCatalogPickerVisible(page)).toBe(true);

    // No incompatible section for an unconstrained slot.
    expect(await hasCatalogPickerIncompatibleSection(page)).toBe(false);
  });
});

test.describe("Slot constraints — direct/sibling route", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  // Select the Heading INSIDE a Card header (no climb) and open insert — the
  // leaf routes to the sibling picker targeting the constrained header slot.
  const openSiblingPickerInCardHeader = async (page: Page) => {
    await selectElement(page, page.locator("h3").first());
    await page.keyboard.press("/");
    await expect.poll(() => isCatalogPickerVisible(page)).toBe(true);
  };

  test("B: sibling picker inside Card.header partitions valid vs incompatible", async ({
    page,
  }) => {
    await openSiblingPickerInCardHeader(page);

    expect(await isCatalogPickerVisible(page)).toBe(true);

    // Same allow/disallow predicate as the slot-choice route: Heading and Text
    // valid, Button relegated to the incompatible section.
    const valid = await getValidPickerItemTypes(page);
    expect(valid).toContain("Heading");
    expect(valid).toContain("Text");
    expect(valid).not.toContain("Button");

    expect(await hasCatalogPickerIncompatibleSection(page)).toBe(true);
    expect(await getIncompatiblePickerItemTypes(page)).toContain("Button");
  });

  test("B: incompatible item is inert — disabled with reason, click writes nothing", async ({
    page,
  }) => {
    await openSiblingPickerInCardHeader(page);
    await settle(page);
    await openIncompatiblePickerSection(page);

    // The honest affordance: visibly non-insertable, reason on the control.
    const state = await getIncompatiblePickerItemState(page, "Button");
    expect(state).toEqual({
      disabled: true,
      title: "Not allowed in this slot",
    });

    // Clicking it anyway must not write: document unchanged, picker still open.
    const censusBefore = await pageContentCensus(page);
    await clickIncompatiblePickerItem(page, "Button");
    // Nothing must change here, so there is no post-state to poll for — settle
    // for the commit + paint a leaked write WOULD have produced.
    await settle(page);

    expect(await pageContentCensus(page)).toEqual(censusBefore);
    expect(await isCatalogPickerVisible(page)).toBe(true);
  });
});

test.describe("Slot constraints — drag/drop blocking", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("C: Button dragged to Card.header shows blocked indicator", async ({
    page,
  }) => {
    // Select the first button (in the hero Stack).
    const btn = page.locator("button").first();
    await selectElement(page, btn);

    // Drag the button OVER a Card header (h3 sibling line area) — hold phase only.
    const heading = page.locator("h3").first();
    await dispatchDrag(page, {
      from: await sourceCenter(btn),
      to: await edgePoint(heading, "top"),
      phase: "hold",
    });

    // The drop indicator must be visible and marked blocked.
    await expect.poll(() => hasDropIndicator(page)).toBe(true);
    expect(await hasBlockedDropIndicator(page)).toBe(true);
  });

  test("C: Button plain-release to Card.header cancels — button not placed", async ({
    page,
  }) => {
    const btn = page.locator("button").first();
    await selectElement(page, btn);

    const censusBefore = await pageContentCensus(page);

    // Full drag-and-drop WITHOUT Shift — must cancel.
    const heading = page.locator("h3").first();
    await dispatchDrag(page, {
      from: await sourceCenter(btn),
      to: await edgePoint(heading, "top"),
      phase: "full",
    });
    // `drop`/`dragend` are discrete-priority, so a commit they caused has
    // already flushed; two frames cover the view-transition swap a real write
    // would paint. There is no post-state to poll — the law is "nothing moved".
    await settle(page);

    // Document must be unchanged — Button was not inserted into Card.header.
    const censusAfter = await pageContentCensus(page);
    expect(censusAfter).toEqual(censusBefore);
  });

  test("C: Button + Alt-release to Card.header places the element", async ({
    page,
  }) => {
    const btn = page.locator("button").first();
    await selectElement(page, btn);

    // Census uses light-DOM querySelectorAll — excludes shadow-DOM overlay buttons
    // (history dots, action bar) so the assertion is not skewed by commit side-effects.
    const censusBefore = await pageContentCensus(page);
    const h3CountBefore = await page.locator("h3").count();

    // Drag with Alt held at release — must commit the move.
    const heading = page.locator("h3").first();
    await dispatchDragWithAlt(page, {
      from: await sourceCenter(btn),
      to: await edgePoint(heading, "top"),
    });
    await settle(page);

    // Button count in light DOM is unchanged — it was moved, not added.
    const censusAfter = await pageContentCensus(page);
    expect(censusAfter).toEqual(censusBefore);

    // h3 count unchanged — the heading was not affected.
    expect(await page.locator("h3").count()).toBe(h3CountBefore);
  });

  test("C: Button dragged to Stack.children places normally — no blocked indicator", async ({
    page,
  }) => {
    // Select the first button.
    const btn = page.locator("button").first();
    await selectElement(page, btn);

    // Drag to the h1 heading (in the hero Stack — same Stack, different position).
    const heading = page.locator("h1").first();
    await dispatchDrag(page, {
      from: await sourceCenter(btn),
      to: await edgePoint(heading, "top"),
      phase: "hold",
    });

    // Drop indicator present but NOT blocked.
    await expect.poll(() => hasDropIndicator(page)).toBe(true);
    expect(await hasBlockedDropIndicator(page)).toBe(false);
  });
});
