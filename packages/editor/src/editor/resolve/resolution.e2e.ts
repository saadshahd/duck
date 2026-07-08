import { test, expect } from "@playwright/test";
import {
  clickToolbarAction,
  isSheetVisible,
  isResolvingVisible,
  isResolveErrorVisible,
  getReadOnlyFieldValue,
  countRole,
} from "../overlay/testing.js";

// TODO(resolve error-path E2E): needs a failing demo resolver — deferred to
// demo-catalog v2 (ticket 102). No demo fixture rejects today, and adding a
// throwing resolver touches the demo catalog (out of scope here). The error
// transition is already covered by resolution-actor.test.ts.

/** Happy-path coverage for the resolve pipeline (previously unit-only, no E2E
 *  path exercising it end to end). `hero-description` (Text) is the only
 *  component with resolveData in the demo catalog: it awaits 1000ms then
 *  populates a read-only `resolvedText` field with `Resolved ${trigger}: ${text}`. */
test.describe("Resolve pipeline — happy path", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  const heroDescriptionText =
    "Duck brings AI composition and human review onto the same surface. No panels. No iframes. Just the page.";
  const elementId = "hero-description";

  const selectHeroDescription = async (
    page: import("@playwright/test").Page,
  ) => {
    await page.getByText(heroDescriptionText, { exact: true }).click();
    await page.waitForTimeout(200);
  };

  test("opening the sheet resolves the field: shimmer first, then the resolved value + readonly badge", async ({
    page,
  }) => {
    await selectHeroDescription(page);
    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(150);

    expect(await isSheetVisible(page)).toBe(true);
    // Shimmer mounts immediately on open, before the resolver's delay elapses.
    expect(await isResolvingVisible(page, elementId)).toBe(true);
    expect(await isResolveErrorVisible(page, elementId)).toBe(false);
    // The field is stale/empty while resolving — never shows a half-resolved value.
    expect(await getReadOnlyFieldValue(page, "Resolved text")).toBe("");

    await expect
      .poll(() => isResolvingVisible(page, elementId), {
        timeout: 3000,
      })
      .toBe(false);

    expect(await getReadOnlyFieldValue(page, "Resolved text")).toBe(
      `Resolved force: ${heroDescriptionText}`,
    );
    expect(await countRole(page, "readonly-badge")).toBeGreaterThan(0);
  });

  test("closing and reopening the sheet re-fires the resolver — not one-shot", async ({
    page,
  }) => {
    await selectHeroDescription(page);
    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(150);

    await expect
      .poll(() => isResolvingVisible(page, elementId), {
        timeout: 3000,
      })
      .toBe(false);
    const firstValue = await getReadOnlyFieldValue(page, "Resolved text");
    expect(firstValue).toBe(`Resolved force: ${heroDescriptionText}`);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    expect(await isSheetVisible(page)).toBe(false);

    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(150);

    // The shimmer reappears — the resolver actually re-ran, it didn't just
    // keep the previously resolved value cached.
    expect(await isResolvingVisible(page, elementId)).toBe(true);

    await expect
      .poll(() => isResolvingVisible(page, elementId), {
        timeout: 3000,
      })
      .toBe(false);
    expect(await getReadOnlyFieldValue(page, "Resolved text")).toBe(
      `Resolved force: ${heroDescriptionText}`,
    );
  });
});
