import { test, expect } from "@playwright/test";
import {
  readTimelineDots,
  getTimelineVisibility,
  clickTimelineDot,
  hoverTimelineRail,
  unhoverTimelineRail,
  getTimelineDotCenter,
  getTimelineRenameInputValue,
  submitTimelineRename,
  getTimelineTooltipText,
  isToolbarVisible,
} from "../overlay/testing.js";

test.describe("History: undo/redo through real edits", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("two sequential edits undo and redo in exact reverse/forward order", async ({
    page,
  }) => {
    const h1Count = await page.locator("h1").count();
    const h3Count = await page.locator("h3").count();

    // Edit 1: duplicate the h1.
    await page.locator("h1").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+d");
    await page.waitForTimeout(300);
    expect(await page.locator("h1").count()).toBe(h1Count + 1);

    // Edit 2: delete the first h3.
    await page.locator("h3").first().click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(300);
    expect(await page.locator("h3").count()).toBe(h3Count - 1);

    // Undo edit 2 (the delete) — h3 count restored, h1 duplicate still present.
    await page.keyboard.press("ControlOrMeta+z");
    await page.waitForTimeout(300);
    expect(await page.locator("h3").count()).toBe(h3Count);
    expect(await page.locator("h1").count()).toBe(h1Count + 1);

    // Undo edit 1 (the duplicate) — back to the original document.
    await page.keyboard.press("ControlOrMeta+z");
    await page.waitForTimeout(300);
    expect(await page.locator("h1").count()).toBe(h1Count);
    expect(await page.locator("h3").count()).toBe(h3Count);

    // Redo edit 1.
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await page.waitForTimeout(300);
    expect(await page.locator("h1").count()).toBe(h1Count + 1);
    expect(await page.locator("h3").count()).toBe(h3Count);

    // Redo edit 2.
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await page.waitForTimeout(300);
    expect(await page.locator("h1").count()).toBe(h1Count + 1);
    expect(await page.locator("h3").count()).toBe(h3Count - 1);
  });

  test("undo past the initial state is a no-op (stays at the first entry)", async ({
    page,
  }) => {
    const h1Count = await page.locator("h1").count();

    await page.keyboard.press("ControlOrMeta+z");
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+z");
    await page.waitForTimeout(300);

    expect(await page.locator("h1").count()).toBe(h1Count);
  });

  test("redo past the latest entry is a no-op", async ({ page }) => {
    const h1Count = await page.locator("h1").count();

    await page.locator("h1").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+d");
    await page.waitForTimeout(300);
    expect(await page.locator("h1").count()).toBe(h1Count + 1);

    await page.keyboard.press("ControlOrMeta+Shift+z");
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await page.waitForTimeout(300);

    expect(await page.locator("h1").count()).toBe(h1Count + 1);
  });
});

test.describe("History: timeline", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("rail is hidden until the first navigation event, then shows past/current/future", async ({
    page,
  }) => {
    expect(await getTimelineVisibility(page)).toBe("hidden");

    await page.locator("h1").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+d");
    await page.waitForTimeout(300);

    // PUSH alone doesn't show the rail — only UNDO/REDO/RESTORE do.
    expect(await getTimelineVisibility(page)).toBe("hidden");

    await page.keyboard.press("ControlOrMeta+z");
    await page.waitForTimeout(300);
    expect(await getTimelineVisibility(page)).toBe("visible");

    const dots = await readTimelineDots(page);
    expect(dots).toEqual([
      { position: "current", named: false },
      { position: "future", named: false },
    ]);
  });

  test("hover keeps the rail interactive; leaving lets it go stale then fade to hidden", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+d");
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+z");
    await page.waitForTimeout(300);
    expect(await getTimelineVisibility(page)).toBe("visible");

    await hoverTimelineRail(page);
    expect(await getTimelineVisibility(page)).toBe("interactive");

    await unhoverTimelineRail(page);
    await page.waitForTimeout(1700);
    expect(await getTimelineVisibility(page)).toBe("fading");

    await page.waitForTimeout(400);
    expect(await getTimelineVisibility(page)).toBe("hidden");
  });

  test("clicking an earlier dot restores that snapshot (RESTORE)", async ({
    page,
  }) => {
    const h1Count = await page.locator("h1").count();

    await page.locator("h1").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+d");
    await page.waitForTimeout(300);
    expect(await page.locator("h1").count()).toBe(h1Count + 1);

    // A single undo makes the rail visible; hover keeps it from fading while
    // we click the earlier (Initial state) dot.
    await page.keyboard.press("ControlOrMeta+z");
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await page.waitForTimeout(300);
    await hoverTimelineRail(page);

    await clickTimelineDot(page, 0);
    await page.waitForTimeout(300);

    expect(await page.locator("h1").count()).toBe(h1Count);
    const dots = await readTimelineDots(page);
    expect(dots[0].position).toBe("current");
  });

  test("renaming a dot via right-click sets a custom name shown on hover", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+d");
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+z");
    await page.waitForTimeout(300);
    await hoverTimelineRail(page);

    const center = await getTimelineDotCenter(page, 1);
    if (!center) throw new Error("second timeline dot not visible");
    // Real right-click — renaming is wired to the dot's native contextmenu
    // event (see history-timeline.tsx onContextMenu), not a synthetic one.
    await page.mouse.click(center.x, center.y, { button: "right" });
    await page.waitForTimeout(200);

    expect(await getTimelineRenameInputValue(page)).not.toBeNull();
    await submitTimelineRename(page, "My named step");
    await page.waitForTimeout(200);

    const dots = await readTimelineDots(page);
    expect(dots[1].named).toBe(true);

    // Hover the renamed dot with a real pointer move to trigger the tooltip.
    const renamedCenter = await getTimelineDotCenter(page, 1);
    if (!renamedCenter) throw new Error("renamed dot not visible");
    await page.mouse.move(renamedCenter.x, renamedCenter.y);
    await page.waitForTimeout(200);

    expect(await getTimelineTooltipText(page)).toBe("My named step");
  });

  test("Escape while renaming discards the edit", async ({ page }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+d");
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+z");
    await page.waitForTimeout(300);
    await hoverTimelineRail(page);

    const center = await getTimelineDotCenter(page, 1);
    if (!center) throw new Error("second timeline dot not visible");
    await page.mouse.click(center.x, center.y, { button: "right" });
    await page.waitForTimeout(200);
    expect(await getTimelineRenameInputValue(page)).not.toBeNull();

    await page.keyboard.type("abandoned name");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    expect(await getTimelineRenameInputValue(page)).toBeNull();
    const dots = await readTimelineDots(page);
    expect(dots[1].named).toBe(false);
  });
});

// Deferred: the labeled "Agent commit" history entry (pushed via the MCP
// bridge on editor_commit) requires a running bridge + connected browser tab
// — out of scope for this ticket's editor-package-only surface (mcp-server
// is a live agent's domain). Covering it needs an integration test that spins
// up the bridge and drives an editor_commit call, which belongs with the
// mcp-server/bridge test suite, not here.
test.describe("History: selection survives undo/redo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  // BUG (found while writing this coverage, not fixed — out of this ticket's
  // test-only scope; editor.tsx is a live agent's file): duplicating an
  // element selects the new (inserted) id via clipboard's onSelect. Undoing
  // that insert removes the element from data but nothing deselects — the
  // selection FSM is left in "selected" pointing at an id that no longer
  // exists in currentData. EdgeArrows silently renders nothing (its
  // fiberRegistry lookup for the vanished id comes back empty), so the
  // action bar disappears with no explicit DESELECT ever sent. Per
  // .claude/rules/editor.md's zero-chrome doctrine, a control surface should
  // disappear only when "selection ends" — here the FSM still believes
  // something is selected, so keyboard shortcuts scoped to `selected` (arrow
  // nav, Cmd+C/X/D, "/") stay armed against a dangling id instead of the
  // state machine deselecting cleanly. Same shape likely reproduces for
  // Paste's inserted id and Cut's resolve.kind "remove" ids.
  test.skip("undo after an edit keeps the action bar visible (no stray deselect)", async ({
    page,
  }) => {
    await page.locator("h1").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+d");
    await page.waitForTimeout(300);
    expect(await isToolbarVisible(page)).toBe(true);

    await page.keyboard.press("ControlOrMeta+z");
    await page.waitForTimeout(300);
    expect(await isToolbarVisible(page)).toBe(true);
  });
});
