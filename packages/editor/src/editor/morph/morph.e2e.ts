import { test, expect, type Page } from "@playwright/test";
import {
  getMorphButtonState,
  clickMorphButton,
  getMorphPickerItems,
  getMorphPickerEntries,
  getMorphPickerRect,
  hasMorphVariantsLabel,
  clickMorphPickerItem,
  hasMorphOverlay,
  climbToParent,
  selectElement,
  settle,
  openTestPage,
} from "../overlay/testing.js";

async function selectFeatureCard(page: Page) {
  await selectElement(page, page.locator("h3").first());
  await climbToParent(page); // Heading → Card (one node→node climb)
}

/** Open the morph picker and wait for the picker itself, not a duration. The
 *  picker is floating-ui anchored, but a probe against this build showed its
 *  rect is already final on the first read after the click — `useAnchor`'s
 *  effect and computePosition both resolve inside the click's own task — so
 *  mount is a sufficient signal. `settle` covers the following INPUT. */
async function openMorphPicker(page: Page) {
  await clickMorphButton(page);
  await expect.poll(() => getMorphPickerItems(page)).not.toBeNull();
  await settle(page);
}

test.describe("Morph", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("morph button is disabled with count 0 for element without patterns or variants", async ({
    page,
  }) => {
    // Text has no top-level select/radio fields and no applicable patterns
    await selectElement(page, page.locator("p").first());

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
    await openMorphPicker(page);

    const items = await getMorphPickerItems(page);
    expect(items).not.toBeNull();
    expect(items!.length).toBeGreaterThan(0);
    expect(items).toContain("Card layout");
  });

  test("hovering pattern in picker shows overlay", async ({ page }) => {
    await selectFeatureCard(page);
    await openMorphPicker(page);

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
    await openMorphPicker(page);

    await clickMorphPickerItem(page, "Centered stack");

    // Picker closed
    await expect.poll(() => getMorphPickerItems(page)).toBeNull();
    // Overlay gone
    expect(await hasMorphOverlay(page)).toBe(false);
  });

  test("Escape closes picker without committing", async ({ page }) => {
    const headingBefore = await page.locator("h3").first().textContent();

    await selectFeatureCard(page);
    await openMorphPicker(page);

    expect(await getMorphPickerItems(page)).not.toBeNull();

    await page.keyboard.press("Escape");

    await expect.poll(() => getMorphPickerItems(page)).toBeNull();
    expect(await hasMorphOverlay(page)).toBe(false);
    expect(await page.locator("h3").first().textContent()).toBe(headingBefore);
  });

  test("Cmd+Z after commit reverts the morph", async ({ page }) => {
    const headingBefore = await page.locator("h3").first().textContent();

    await selectFeatureCard(page);
    await openMorphPicker(page);
    await clickMorphPickerItem(page, "Card layout");
    await expect.poll(() => getMorphPickerItems(page)).toBeNull();
    await settle(page);

    await page.keyboard.press("Meta+z");

    // `merge` carries the matched Heading into the template wholesale, so the
    // h3 text is identical while the morph is applied — polling for it would
    // pass before the undo lands. Two frames give the undo its chance instead.
    await settle(page);
    expect(await page.locator("h3").first().textContent()).toBe(headingBefore);
  });

  test("Grid gives no patterns, only quick variants (opaque card children)", async ({
    page,
  }) => {
    // Heading → slot-stop → Card → slot-stop → Grid
    await selectElement(page, page.locator("h3").first());
    await climbToParent(page); // lands on Card
    await climbToParent(page); // lands on Grid

    const state = await getMorphButtonState(page);
    expect(state).not.toBeNull();
    expect(state!.disabled).toBe(false);

    await openMorphPicker(page);

    const entries = await getMorphPickerEntries(page);
    expect(entries).not.toBeNull();
    expect(entries!.length).toBeGreaterThan(0);
    expect(entries!.every((e) => e.kind === "variant")).toBe(true);
  });

  test("picker anchors beside the element, never occluding it", async ({
    page,
  }) => {
    await selectElement(page, page.locator("h1"));

    await openMorphPicker(page);

    const element = await page.locator("h1").boundingBox();
    const picker = await getMorphPickerRect(page);
    expect(element).not.toBeNull();
    expect(picker).not.toBeNull();

    // Doctrine: the control surface must not occlude the selected element. The
    // picker's rect must not intersect the morphed element's rect — it sits
    // beside the box (right-start / left-start), not dropped over it.
    const overlapsX =
      picker!.left < element!.x + element!.width && picker!.right > element!.x;
    const overlapsY =
      picker!.top < element!.y + element!.height && picker!.bottom > element!.y;
    expect(overlapsX && overlapsY).toBe(false);
  });

  test("quick variants appear as a labeled group and commit a prop change", async ({
    page,
  }) => {
    const headingText = await page.locator("h1").textContent();

    await selectElement(page, page.locator("h1"));

    await openMorphPicker(page);

    // Heading level h1 → H2/H3/H4 offered; the active option (H1) is skipped
    expect(await hasMorphVariantsLabel(page)).toBe(true);
    const entries = await getMorphPickerEntries(page);
    expect(entries).not.toBeNull();
    const variantNames = entries!
      .filter((e) => e.kind === "variant")
      .map((e) => e.name);
    expect(variantNames).toEqual(["H2", "H3", "H4"]);

    await clickMorphPickerItem(page, "H2");

    // Prop replaced: same text now renders as h2, picker closed
    await expect
      .poll(() => page.locator("h2").first().textContent())
      .toBe(headingText);
    await expect.poll(() => getMorphPickerItems(page)).toBeNull();
    await settle(page);

    // Cmd+Z reverts the variant commit. The h1 does not exist while the variant
    // is applied, so `textContent()` on it genuinely waits for the undo to land.
    await page.keyboard.press("Meta+z");
    expect(await page.locator("h1").textContent()).toBe(headingText);
  });
});
