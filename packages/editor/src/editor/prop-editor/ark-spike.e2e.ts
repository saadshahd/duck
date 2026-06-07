import { test, expect } from "@playwright/test";
import { clickToolbarAction, isSheetVisible } from "../overlay/testing.js";

/**
 * T1 GO/NO-GO gate: prove Ark UI primitives work inside the editor's OPEN
 * shadow root under React 19. The spike mounts one Ark ToggleGroup in the open
 * prop sheet (data-role="ark-spike-toggle" / "ark-spike-item"). These observers
 * exercise the four real shadow-DOM risks: render, keyboard nav, focus
 * containment, and plain-CSS application via useShadowSheet.
 *
 * The ToggleGroup itself is throwaway (T4 replaces it). This file proves the
 * EnvironmentProvider wiring, which is the kept artifact.
 */

// Read the spike's items from the overlay shadow root: each item's value, its
// data-state ("on" when selected), and whether it is the shadow root's
// activeElement (focus containment proof). One pass, role-queried only.
const readSpikeItems = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const active = d.shadowRoot.activeElement;
      return [
        ...d.shadowRoot.querySelectorAll("[data-role='ark-spike-item']"),
      ].map((el) => ({
        value: el.getAttribute("data-value"),
        state: el.getAttribute("data-state"),
        focused: el === active,
        // Computed background proves the colocated plain CSS (registered via
        // useShadowSheet) actually applied inside the shadow root.
        bg: getComputedStyle(el as HTMLElement).backgroundColor,
      }));
    }
    return null;
  });

const openSheet = async (page: import("@playwright/test").Page) => {
  await page.locator("h1").click();
  await page.waitForTimeout(200);
  await clickToolbarAction(page, "edit");
  await page.waitForTimeout(400);
};

// Focus the first spike item directly inside the shadow root, returning whether
// the focus landed (activeElement is the item) — the real shadow-DOM focus risk.
const focusFirstItem = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const item = d.shadowRoot.querySelector(
        "[data-role='ark-spike-item']",
      ) as HTMLElement | null;
      item?.focus();
      return d.shadowRoot.activeElement === item;
    }
    return false;
  });

test.describe("Ark UI shadow-DOM spike (T1 gate)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("renders the Ark ToggleGroup inside the open sheet with plain CSS applied", async ({
    page,
  }) => {
    await openSheet(page);
    expect(await isSheetVisible(page)).toBe(true);

    const items = await readSpikeItems(page);
    expect(items).not.toBeNull();
    // Three options rendered.
    expect(items!.map((i) => i.value)).toEqual(["left", "center", "right"]);

    // Default selection is "left" (data-state="on").
    const selected = items!.filter((i) => i.state === "on");
    expect(selected.map((i) => i.value)).toEqual(["left"]);

    // Plain CSS applied: the selected item has the non-default background the
    // colocated stylesheet sets for [data-state="on"] (rgb(37, 99, 235)).
    expect(selected[0].bg).toBe("rgb(37, 99, 235)");
  });

  test("is keyboard-navigable and keeps focus inside the shadow root", async ({
    page,
  }) => {
    await openSheet(page);

    // Focus lands on the first item INSIDE the shadow root.
    expect(await focusFirstItem(page)).toBe(true);

    // ArrowRight moves the roving focus to the next item, still inside the
    // shadow root — the core shadow-DOM keyboard risk.
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(100);

    const afterRight = await readSpikeItems(page);
    expect(afterRight).not.toBeNull();
    const focusedRight = afterRight!.find((i) => i.focused);
    expect(focusedRight?.value).toBe("center");

    // Space selects the focused item; selection moves to "center".
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
    const afterSelect = await readSpikeItems(page);
    expect(
      afterSelect!.filter((i) => i.state === "on").map((i) => i.value),
    ).toEqual(["center"]);

    // ArrowLeft rolls focus back to the first item, still contained.
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(100);
    const afterLeft = await readSpikeItems(page);
    expect(afterLeft!.find((i) => i.focused)?.value).toBe("left");
  });
});
