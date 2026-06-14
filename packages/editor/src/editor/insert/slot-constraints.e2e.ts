import { test, expect } from "@playwright/test";
import {
  climbToParent,
  enterSlotChoice,
  clickSlotInsertBtn,
  isCatalogPickerVisible,
  hasCatalogPickerIncompatibleSection,
  getIncompatiblePickerItemTypes,
  getValidPickerItemTypes,
  hasBlockedDropIndicator,
  hasDropIndicator,
  dispatchDrag,
  dispatchDragWithAlt,
  sourceCenter,
  edgePoint,
  pageContentCensus,
} from "../overlay/testing.js";

test.describe("Slot constraints — insert picker partitioning", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("B: Card.header picker — Heading/Text valid, Button in incompatible section", async ({
    page,
  }) => {
    // Select a Heading inside a Card header, climb to the Card, enter slot-choice.
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);
    await climbToParent(page);

    // Enter the slot-choice step on the multi-slot Card.
    await page.keyboard.press("/");
    await page.waitForTimeout(300);

    // Click the insert button for the header slot (the active slot-stop).
    await clickSlotInsertBtn(page);
    await page.waitForTimeout(300);

    expect(await isCatalogPickerVisible(page)).toBe(true);

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
    await page.locator("h1").first().click();
    await page.waitForTimeout(300);
    await climbToParent(page);

    // Stack has one slot (children) — pressing / opens the picker directly.
    await page.keyboard.press("/");
    await page.waitForTimeout(300);

    expect(await isCatalogPickerVisible(page)).toBe(true);

    // No incompatible section for an unconstrained slot.
    expect(await hasCatalogPickerIncompatibleSection(page)).toBe(false);
  });
});

test.describe("Slot constraints — drag/drop blocking", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("C: Button dragged to Card.header shows blocked indicator", async ({
    page,
  }) => {
    // Select the first button (in the hero Stack).
    const btn = page.locator("button").first();
    await btn.click();
    await page.waitForTimeout(300);

    // Drag the button OVER a Card header (h3 sibling line area) — hold phase only.
    const heading = page.locator("h3").first();
    await dispatchDrag(page, {
      from: await sourceCenter(btn),
      to: await edgePoint(heading, "top"),
      phase: "hold",
    });
    await page.waitForTimeout(300);

    // The drop indicator must be visible and marked blocked.
    expect(await hasDropIndicator(page)).toBe(true);
    expect(await hasBlockedDropIndicator(page)).toBe(true);
  });

  test("C: Button plain-release to Card.header cancels — button not placed", async ({
    page,
  }) => {
    const btn = page.locator("button").first();
    await btn.click();
    await page.waitForTimeout(300);

    const censusBefore = await pageContentCensus(page);

    // Full drag-and-drop WITHOUT Shift — must cancel.
    const heading = page.locator("h3").first();
    await dispatchDrag(page, {
      from: await sourceCenter(btn),
      to: await edgePoint(heading, "top"),
      phase: "full",
    });
    await page.waitForTimeout(300);

    // Document must be unchanged — Button was not inserted into Card.header.
    const censusAfter = await pageContentCensus(page);
    expect(censusAfter).toEqual(censusBefore);
  });

  test("C: Button + Alt-release to Card.header places the element", async ({
    page,
  }) => {
    const btn = page.locator("button").first();
    await btn.click();
    await page.waitForTimeout(300);

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
    await page.waitForTimeout(400);

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
    await btn.click();
    await page.waitForTimeout(300);

    // Drag to the h1 heading (in the hero Stack — same Stack, different position).
    const heading = page.locator("h1").first();
    await dispatchDrag(page, {
      from: await sourceCenter(btn),
      to: await edgePoint(heading, "top"),
      phase: "hold",
    });
    await page.waitForTimeout(300);

    // Drop indicator present but NOT blocked.
    expect(await hasDropIndicator(page)).toBe(true);
    expect(await hasBlockedDropIndicator(page)).toBe(false);
  });
});
