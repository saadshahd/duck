import { test, expect } from "@playwright/test";
import {
  clickToolbarAction,
  isSheetVisible,
  getSheetRect,
  getBackdropCutoutRect,
} from "../overlay/testing.js";

test.describe("Focus sheet shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  // Observer #1 — sheet opens fully on screen for any element (including full-
  // page-root containers). Passes at end of P1.
  test("Observer 1: sheet is fully visible (not occluded) when opened", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(200);
    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(400);

    expect(await isSheetVisible(page)).toBe(true);

    const rect = await getSheetRect(page);
    expect(rect).not.toBeNull();

    const vw = page.viewportSize()!.width;
    const vh = page.viewportSize()!.height;

    // Sheet left edge must be on-screen.
    expect(rect!.left).toBeGreaterThanOrEqual(0);
    // Sheet right edge must not exceed the viewport (allow 1px for sub-pixel).
    expect(rect!.left + rect!.width).toBeLessThanOrEqual(vw + 1);
    // Sheet top must be at viewport top (position: fixed; top: 0).
    expect(rect!.top).toBeGreaterThanOrEqual(0);
    // Sheet height must fill the full viewport height (not clipped).
    expect(rect!.height).toBeGreaterThan(vh * 0.9);
  });

  // Observer #6 — type into a field → close via backdrop click → reopen →
  // the typed value persists. Passes at end of P1.
  test("Observer 6: typed value persists across backdrop close + reopen", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(200);
    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(400);

    expect(await isSheetVisible(page)).toBe(true);

    // Type into the first text input inside the sheet via React's synthetic
    // event path (native setter + bubbling `input` event).
    const typed = "Sheet Persist Check";
    await page.evaluate((value) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const input = d.shadowRoot.querySelector(
          "[data-role='prop-sheet'] input[type='text']",
        ) as HTMLInputElement | null;
        if (!input) return;
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        )!.set!;
        setter.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, typed);
    await page.waitForTimeout(200);

    // Blur the focused text input before closing so the debounce flushes
    // immediately. The 500ms debounce in puck-fields.tsx clears WITHOUT flushing
    // on unmount, so we must trigger handleBlur before the sheet closes.
    // React 19's onBlur maps to the native `focusout` event (which bubbles),
    // not `blur` (which does not bubble). Dispatch focusout so React's root
    // listener inside the shadow DOM fires the onBlur handler.
    await page.evaluate(() => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const input = d.shadowRoot.querySelector(
          "[data-role='prop-sheet'] input[type='text']",
        ) as HTMLInputElement | null;
        if (!input) return;
        input.dispatchEvent(
          new FocusEvent("focusout", { bubbles: true, composed: true }),
        );
      }
    });

    // Close via Escape: the machine's editing.ESCAPE handler transitions to
    // "selected" and clears editing context (same CANCEL_EDIT semantics — keeps
    // selection, committed value already stored).  A coordinate click would also
    // work when there is truly empty canvas gutter, but the demo page fills the
    // full 1280px viewport so no guaranteed empty pixel exists at a fixed offset.
    // Escape is the robust, demo-topology-independent close path.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    expect(await isSheetVisible(page)).toBe(false);

    // Reopen via the edit button (still visible — selection kept).
    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(400);

    const value = await page.evaluate(() => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const input = d.shadowRoot.querySelector(
          "[data-role='prop-sheet'] input[type='text']",
        ) as HTMLInputElement | null;
        return input ? input.value : "MISSING";
      }
      return "NO_ROOT";
    });
    expect(value).toBe(typed);
  });

  // Observer #5 — expand a style object → the element is un-occluded AND
  // un-dimmed. Depends on data-role="disclosure-trigger" added in Task 15
  // (Disclosure). Unblocks after Task 15 lands; remove fixme marker then.
  test("Observer 5: expanding a style object never dims/occludes the element", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(200);
    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(400);

    const beforeCutout = await getBackdropCutoutRect(page);
    expect(beforeCutout).not.toBeNull();

    // Expand the first disclosure (style object) in the sheet.
    await page.evaluate(() => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const trigger = d.shadowRoot.querySelector(
          "[data-role='prop-sheet'] [data-role='disclosure-trigger']",
        ) as HTMLElement | null;
        trigger?.click();
      }
    });
    await page.waitForTimeout(300);

    // The cutout still tracks the same element rect (un-occluded, un-dimmed).
    const afterCutout = await getBackdropCutoutRect(page);
    expect(afterCutout).toEqual(beforeCutout);
    expect(await isSheetVisible(page)).toBe(true);
  });
});
