import { test, expect } from "@playwright/test";
import {
  getMorphButtonState,
  clickMorphButton,
  getMorphPickerItems,
  clickMorphPickerItem,
  hasMorphOverlay,
  waitFrames,
  selectParentElement,
} from "../overlay/testing.js";

// Selects a Card in the feature grid by clicking its heading text then going up
async function selectFeatureCard(page: import("@playwright/test").Page) {
  await page.getByText("Zero Chrome", { exact: true }).click();
  await page.waitForTimeout(300);
  await selectParentElement(page); // Heading → Card
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

    // Hover first picker item
    await page.evaluate(() => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const item = d.shadowRoot.querySelector(
          ".morph-picker-item",
        ) as HTMLElement | null;
        item?.dispatchEvent(
          new MouseEvent("mouseover", {
            bubbles: true,
            relatedTarget: document.body,
          }),
        );
        return;
      }
    });
    await waitFrames(page, 2);

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
    await selectFeatureCard(page);
    await clickMorphButton(page);
    await page.waitForTimeout(200);

    expect(await getMorphPickerItems(page)).not.toBeNull();

    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    expect(await getMorphPickerItems(page)).toBeNull();
    expect(await hasMorphOverlay(page)).toBe(false);
    await expect(page.getByText("Zero Chrome", { exact: true })).toBeVisible();
  });

  test("Cmd+Z after commit reverts the morph", async ({ page }) => {
    await selectFeatureCard(page);
    await clickMorphButton(page);
    await page.waitForTimeout(200);
    await clickMorphPickerItem(page, "Card layout");
    await page.waitForTimeout(300);

    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(300);

    await expect(page.getByText("Zero Chrome", { exact: true })).toBeVisible();
  });

  test("Grid gives no morph suggestions (opaque card children)", async ({
    page,
  }) => {
    // Click a card heading then go up twice: Heading → Card → Grid
    await page.getByText("Zero Chrome", { exact: true }).click();
    await page.waitForTimeout(300);
    await selectParentElement(page); // → Card
    await page.waitForTimeout(300);
    await selectParentElement(page); // → Grid
    await page.waitForTimeout(300);

    const state = await getMorphButtonState(page);
    expect(state).not.toBeNull();
    expect(state!.disabled).toBe(true);
    expect(state!.count).toBe(0);
  });
});
