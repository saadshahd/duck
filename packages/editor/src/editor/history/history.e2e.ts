import { test, expect, type Page } from "@playwright/test";
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
  countSelectionRings,
  isCatalogPickerVisible,
  openTestPage,
  selectElement,
  settle,
} from "../overlay/testing.js";

/** Press a history shortcut and let the render loop close before the next input.
 *  A DOM assertion is NOT a sufficient gap here: toHaveCount resolves the instant
 *  the DOM mutates, which is mid-commit, and firing the next shortcut at that
 *  moment loses the redo future (the host's data-prop echo re-seeds history
 *  through useExternalDataSync). Two frames is the real boundary — measured, not
 *  guessed: assert-between alone fails, assert-between plus this settle passes. */
const pressHistory = async (page: Page, combo: string) => {
  await page.keyboard.press(combo);
  await settle(page);
};

test.describe("History: undo/redo through real edits", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("two sequential edits undo and redo in exact reverse/forward order", async ({
    page,
  }) => {
    const h1 = page.locator("h1");
    const h3 = page.locator("h3");
    const h1Count = await h1.count();
    const h3Count = await h3.count();

    // Edit 1: duplicate the h1.
    await selectElement(page, h1);
    await pressHistory(page, "ControlOrMeta+d");
    await expect(h1).toHaveCount(h1Count + 1);

    // Edit 2: delete the first h3.
    await selectElement(page, h3.first());
    await pressHistory(page, "Backspace");
    await expect(h3).toHaveCount(h3Count - 1);

    // Undo edit 2 (the delete) — h3 count restored, h1 duplicate still present.
    await pressHistory(page, "ControlOrMeta+z");
    await expect(h3).toHaveCount(h3Count);
    await expect(h1).toHaveCount(h1Count + 1);

    // Undo edit 1 (the duplicate) — back to the original document.
    await pressHistory(page, "ControlOrMeta+z");
    await expect(h1).toHaveCount(h1Count);
    await expect(h3).toHaveCount(h3Count);

    // Redo edit 1.
    await pressHistory(page, "ControlOrMeta+Shift+z");
    await expect(h1).toHaveCount(h1Count + 1);
    await expect(h3).toHaveCount(h3Count);

    // Redo edit 2.
    await pressHistory(page, "ControlOrMeta+Shift+z");
    await expect(h1).toHaveCount(h1Count + 1);
    await expect(h3).toHaveCount(h3Count - 1);
  });

  test("undo past the initial state is a no-op (stays at the first entry)", async ({
    page,
  }) => {
    const h1 = page.locator("h1");
    const h1Count = await h1.count();

    await pressHistory(page, "ControlOrMeta+z");
    await pressHistory(page, "ControlOrMeta+z");

    await expect(h1).toHaveCount(h1Count);
  });

  test("redo past the latest entry is a no-op", async ({ page }) => {
    const h1 = page.locator("h1");
    const h1Count = await h1.count();

    await selectElement(page, h1);
    await pressHistory(page, "ControlOrMeta+d");
    await expect(h1).toHaveCount(h1Count + 1);

    await pressHistory(page, "ControlOrMeta+Shift+z");
    await pressHistory(page, "ControlOrMeta+Shift+z");

    await expect(h1).toHaveCount(h1Count + 1);
  });
});

test.describe("History: timeline", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  /** Duplicate the h1 then undo it — the shortest path to a visible rail, since
   *  only UNDO/REDO/RESTORE reveal it. */
  const undoOneEdit = async (page: Page) => {
    const h1 = page.locator("h1");
    const h1Count = await h1.count();
    await selectElement(page, h1);
    await pressHistory(page, "ControlOrMeta+d");
    await expect(h1).toHaveCount(h1Count + 1);
    await pressHistory(page, "ControlOrMeta+z");
    await expect(h1).toHaveCount(h1Count);
  };

  test("rail is hidden until the first navigation event, then shows past/current/future", async ({
    page,
  }) => {
    const h1 = page.locator("h1");
    const h1Count = await h1.count();

    expect(await getTimelineVisibility(page)).toBe("hidden");

    await selectElement(page, h1);
    await pressHistory(page, "ControlOrMeta+d");
    await expect(h1).toHaveCount(h1Count + 1);

    // PUSH alone doesn't show the rail — only UNDO/REDO/RESTORE do.
    expect(await getTimelineVisibility(page)).toBe("hidden");

    await pressHistory(page, "ControlOrMeta+z");
    await expect.poll(() => getTimelineVisibility(page)).toBe("visible");

    const dots = await readTimelineDots(page);
    expect(dots).toEqual([
      { position: "current", named: false },
      { position: "future", named: false },
    ]);
  });

  test("hover keeps the rail interactive; leaving lets it go stale then fade to hidden", async ({
    page,
  }) => {
    await undoOneEdit(page);
    await expect.poll(() => getTimelineVisibility(page)).toBe("visible");

    await hoverTimelineRail(page);
    expect(await getTimelineVisibility(page)).toBe("interactive");

    // The stale timer and the fade-out are genuine elapsed-time transitions
    // (interactive → stale 1500ms → fading 300ms → hidden). `fading` is only
    // open for those 300ms, and expect.poll's default backoff would step clean
    // over it, so this samples tightly enough to observe the state itself.
    await unhoverTimelineRail(page);
    await expect
      .poll(() => getTimelineVisibility(page), { intervals: [50] })
      .toBe("fading");
    await expect.poll(() => getTimelineVisibility(page)).toBe("hidden");
  });

  test("clicking an earlier dot restores that snapshot (RESTORE)", async ({
    page,
  }) => {
    const h1 = page.locator("h1");
    const h1Count = await h1.count();

    await selectElement(page, h1);
    await pressHistory(page, "ControlOrMeta+d");
    await expect(h1).toHaveCount(h1Count + 1);

    // A single undo makes the rail visible; hover keeps it from fading while
    // we click the earlier (Initial state) dot.
    await pressHistory(page, "ControlOrMeta+z");
    await expect(h1).toHaveCount(h1Count);
    await pressHistory(page, "ControlOrMeta+Shift+z");
    await expect(h1).toHaveCount(h1Count + 1);
    await hoverTimelineRail(page);

    await clickTimelineDot(page, 0);
    await expect(h1).toHaveCount(h1Count);

    const dots = await readTimelineDots(page);
    expect(dots[0].position).toBe("current");
  });

  test("renaming a dot via right-click sets a custom name shown on hover", async ({
    page,
  }) => {
    await undoOneEdit(page);
    await hoverTimelineRail(page);

    const center = await getTimelineDotCenter(page, 1);
    if (!center) throw new Error("second timeline dot not visible");
    // Real right-click — renaming is wired to the dot's native contextmenu
    // event (see history-timeline.tsx onContextMenu), not a synthetic one.
    await page.mouse.click(center.x, center.y, { button: "right" });
    await expect.poll(() => getTimelineRenameInputValue(page)).not.toBeNull();

    await submitTimelineRename(page, "My named step");
    await expect
      .poll(async () => (await readTimelineDots(page))[1].named)
      .toBe(true);

    // Hover the renamed dot with a real pointer move to trigger the tooltip.
    const renamedCenter = await getTimelineDotCenter(page, 1);
    if (!renamedCenter) throw new Error("renamed dot not visible");
    await page.mouse.move(renamedCenter.x, renamedCenter.y);

    await expect.poll(() => getTimelineTooltipText(page)).toBe("My named step");
  });

  test("Escape while renaming discards the edit", async ({ page }) => {
    await undoOneEdit(page);
    await hoverTimelineRail(page);

    const center = await getTimelineDotCenter(page, 1);
    if (!center) throw new Error("second timeline dot not visible");
    await page.mouse.click(center.x, center.y, { button: "right" });
    await expect.poll(() => getTimelineRenameInputValue(page)).not.toBeNull();

    await page.keyboard.type("abandoned name");
    await page.keyboard.press("Escape");
    await expect.poll(() => getTimelineRenameInputValue(page)).toBeNull();

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
// A selection over a missing id is not a representable steady state: on every
// committed data change, Selection.reconcile (wired via useSelectionReconcile
// in the shell) sends DESELECT when the selected id — or the selected slot's
// parent — no longer resolves in the new snapshot. The FSM leaves `selected`,
// chrome vanishes because selection ENDED (zero-chrome doctrine), and
// selected-scoped keybindings disarm. The disarm probe is "/": it opens the
// insert picker only while the FSM holds a live selection.
test.describe("History: data change removing the selected element deselects", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  const expectDeselected = async (page: Page) => {
    expect(await isToolbarVisible(page)).toBe(false);
    expect(await countSelectionRings(page)).toBe(0);
    await page.keyboard.press("/");
    await settle(page);
    expect(await isCatalogPickerVisible(page)).toBe(false);
  };

  test("undo of duplicate drops the selection and disarms selected-scoped keys", async ({
    page,
  }) => {
    const h1 = page.locator("h1");
    const h1Count = await h1.count();

    await selectElement(page, h1);
    await pressHistory(page, "ControlOrMeta+d");
    await expect(h1).toHaveCount(h1Count + 1);
    expect(await isToolbarVisible(page)).toBe(true);

    await pressHistory(page, "ControlOrMeta+z");
    await expect.poll(() => isToolbarVisible(page)).toBe(false);
    await expectDeselected(page);
  });

  test("undo of paste drops the selection", async ({ page }) => {
    const h1 = page.locator("h1");
    const h1Count = await h1.count();

    await selectElement(page, h1);
    await pressHistory(page, "ControlOrMeta+c");
    await settle(page);
    await pressHistory(page, "ControlOrMeta+v");
    await expect(h1).toHaveCount(h1Count + 1);
    expect(await isToolbarVisible(page)).toBe(true);

    await pressHistory(page, "ControlOrMeta+z");
    await expect(h1).toHaveCount(h1Count);
    await expect.poll(() => isToolbarVisible(page)).toBe(false);
    await expectDeselected(page);
  });

  test("external data replacement removing the selected element drops the selection", async ({
    page,
  }) => {
    const h1 = page.locator("h1");

    await selectElement(page, h1);
    expect(await isToolbarVisible(page)).toBe(true);

    // A bridge-like push lands on the same edge: the public `data` prop.
    await page.evaluate(() => {
      const w = window as unknown as {
        __duckReplaceData?: (data: unknown) => void;
      };
      w.__duckReplaceData?.({ content: [], root: { props: {} }, zones: {} });
    });
    await expect(h1).toHaveCount(0);

    await expectDeselected(page);
  });
});
