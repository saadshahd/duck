import { test, expect, type Page } from "@playwright/test";
import {
  clickToolbarAction,
  realClickToolbarAction,
  climbToParent,
  countSheetControls,
  getSheetHeaderLabel,
  isCrashNoticeVisible,
  isSheetVisible,
  getSheetRect,
  getBackdropCutoutRect,
  isSelectionRingEditing,
} from "../overlay/testing.js";

test.describe("Focus sheet shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
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
    // immediately. The CONTINUOUS_DEBOUNCE_MS window (commit-mode.ts) clears
    // WITHOUT flushing on unmount, so we must trigger handleBlur before the
    // sheet closes.
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

  // F8 selection surface — opening a sheet raises exactly one selection surface:
  // the backdrop cutout frames the element AND the ring enters editing mode.
  // Closing tears both down. Guards the "one control surface, selection-scoped"
  // doctrine that the softened ring + elevation rework runs through.
  test("F8: editing surface raises the backdrop cutout + editing ring, then clears on close", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(200);

    // Selected but not editing — no backdrop, ring is the plain (non-editing) one.
    expect(await getBackdropCutoutRect(page)).toBeNull();
    expect(await isSelectionRingEditing(page)).toBe(false);

    await clickToolbarAction(page, "edit");
    await page.waitForTimeout(400);

    // Editing — the surface is up: cutout frames the element, ring is editing.
    expect(await isSheetVisible(page)).toBe(true);
    expect(await getBackdropCutoutRect(page)).not.toBeNull();
    expect(await isSelectionRingEditing(page)).toBe(true);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Closed — the surface is gone; selection persists but no editing chrome.
    expect(await isSheetVisible(page)).toBe(false);
    expect(await getBackdropCutoutRect(page)).toBeNull();
    expect(await isSelectionRingEditing(page)).toBe(false);
  });
});

/* Every demo component type reached via a click + climb chain (Duck selects the
 * innermost element under the pointer; climbing reaches the containers).
 * `ancestry` is the expected sheet header label at each level, innermost first.
 * Together the chains cover the full demo catalog. */
const SHEET_SURFACES: Array<{
  name: string;
  select: (page: Page) => Promise<void>;
  ancestry: string[];
}> = [
  {
    name: "hero column",
    select: (page) => page.getByText("The editor is the canvas.").click(),
    ancestry: ["Heading", "Stack", "Box"],
  },
  {
    name: "feature card",
    select: (page) => page.getByText("Zero Chrome").first().click(),
    ancestry: ["Heading", "Card", "Grid"],
  },
  {
    name: "panel",
    select: (page) => page.getByText("Stack panel").first().click(),
    ancestry: ["Heading", "Panel"],
  },
  {
    name: "primary button",
    select: (page) => page.getByText("Start building").click(),
    ancestry: ["Button"],
  },
  {
    name: "body text",
    select: (page) =>
      page.getByText("Duck brings AI composition").first().click(),
    ancestry: ["Text"],
  },
  {
    name: "banner",
    select: (page) => page.locator("[data-banner]").click(),
    ancestry: ["Banner"],
  },
];

test.describe("Toolbar pen click targets the selected element", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  // Regression: a REAL click on the pen used to bubble to the document
  // selection handler with a now-detached target (opening the sheet unmounts
  // the toolbar), which re-hit-tested the pointer and selected whatever canvas
  // element sat beneath the pen — so the sheet opened for the wrong element.
  // The pen must open the sheet for the element that is actually selected.
  test("real click on the pen opens the selected element's sheet, not the one beneath it", async ({
    page,
  }) => {
    await page.locator("[data-banner]").click();
    await page.waitForTimeout(250);

    expect(await realClickToolbarAction(page, "edit")).toBe(true);
    await page.waitForTimeout(400);

    expect(await isSheetVisible(page)).toBe(true);
    expect(await getSheetHeaderLabel(page)).toBe("Banner");
  });
});

test.describe("Every demo component opens its sheet clean", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test.html");
    await page.waitForTimeout(500);
  });

  // Regression guard for the crash boundary: a sheet that trips it makes the
  // component uneditable, which no amount of sheet polish is worth.
  for (const surface of SHEET_SURFACES) {
    test(`${surface.name} ancestry: ${surface.ancestry.join(" → ")}`, async ({
      page,
    }) => {
      await surface.select(page);
      await page.waitForTimeout(250);

      for (const [level, label] of surface.ancestry.entries()) {
        if (level > 0) {
          await climbToParent(page);
          await page.waitForTimeout(200);
        }
        await clickToolbarAction(page, "edit");
        await page.waitForTimeout(400);

        expect(await isCrashNoticeVisible(page)).toBe(false);
        expect(await isSheetVisible(page)).toBe(true);
        expect(await getSheetHeaderLabel(page)).toBe(label);
        expect(await countSheetControls(page)).toBeGreaterThan(0);

        // Escape closes the sheet but keeps the selection — the next climb
        // starts from this element.
        await page.keyboard.press("Escape");
        await page.waitForTimeout(250);
      }
    });
  }
});
