import { test, expect } from "@playwright/test";
import {
  getMorphButtonState,
  clickMorphButton,
  getMorphPickerItems,
  clickMorphPickerItem,
  hasMorphOverlay,
  climbToParent,
} from "../overlay/testing.js";

async function selectFeatureCard(page: import("@playwright/test").Page) {
  await page.locator("h3").first().click();
  await page.waitForTimeout(300);
  await climbToParent(page); // Heading → slot-stop → Card
  await page.waitForTimeout(300);
}

test.describe("Morph", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("morph button is disabled with count 0 for leaf element", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);

    const state = await getMorphButtonState(page);
    expect(state).not.toBeNull();
    expect(state!.disabled).toBe(true);
    expect(state!.count).toBe(0);
  });

  test("morph button shows count when container with patterns is selected", async ({
    page,
  }) => {
    await selectFeatureCard(page);

    const state = await getMorphButtonState(page);
    expect(state).not.toBeNull();
    expect(state!.disabled).toBe(false);
    expect(state!.count).toBeGreaterThan(0);
  });

  test("clicking morph button opens picker with patterns", async ({ page }) => {
    await selectFeatureCard(page);
    await clickMorphButton(page);
    await page.waitForTimeout(200);

    const items = await getMorphPickerItems(page);
    expect(items).not.toBeNull();
    expect(items!.length).toBeGreaterThan(0);
    expect(items).toContain("Card layout");
  });

  test("hovering pattern in picker shows overlay", async ({ page }) => {
    await selectFeatureCard(page);
    await clickMorphButton(page);
    await page.waitForTimeout(200);

    // ArrowDown triggers the picker's document-level keydown handler
    // which calls onHover(0) → setActivePattern → overlay renders
    await page.keyboard.press("ArrowDown");

    await page.waitForSelector("[data-role='morph-overlay']");
    expect(await hasMorphOverlay(page)).toBe(true);
  });

  test("committing pattern replaces element and closes picker", async ({
    page,
  }) => {
    await selectFeatureCard(page);
    await clickMorphButton(page);
    await page.waitForTimeout(200);

    await clickMorphPickerItem(page, "Centered stack");
    await page.waitForTimeout(300);

    // Picker closed
    expect(await getMorphPickerItems(page)).toBeNull();
    // Overlay gone
    expect(await hasMorphOverlay(page)).toBe(false);
  });

  test("Escape closes picker without committing", async ({ page }) => {
    const headingBefore = await page.locator("h3").first().textContent();

    await selectFeatureCard(page);
    await clickMorphButton(page);
    await page.waitForTimeout(200);

    expect(await getMorphPickerItems(page)).not.toBeNull();

    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    expect(await getMorphPickerItems(page)).toBeNull();
    expect(await hasMorphOverlay(page)).toBe(false);
    expect(await page.locator("h3").first().textContent()).toBe(headingBefore);
  });

  test("Cmd+Z after commit reverts the morph", async ({ page }) => {
    const headingBefore = await page.locator("h3").first().textContent();

    await selectFeatureCard(page);
    await clickMorphButton(page);
    await page.waitForTimeout(200);
    await clickMorphPickerItem(page, "Card layout");
    await page.waitForTimeout(300);

    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(300);

    expect(await page.locator("h3").first().textContent()).toBe(headingBefore);
  });

  test("Grid gives no morph suggestions (opaque card children)", async ({
    page,
  }) => {
    // Heading → slot-stop → Card → slot-stop → Grid
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);
    await climbToParent(page); // lands on Card
    await page.waitForTimeout(300);
    await climbToParent(page); // lands on Grid
    await page.waitForTimeout(300);

    const state = await getMorphButtonState(page);
    expect(state).not.toBeNull();
    expect(state!.disabled).toBe(true);
    expect(state!.count).toBe(0);
  });
});
