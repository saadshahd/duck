import { test, expect, type Page } from "@playwright/test";
import {
  isCatalogPickerVisible,
  clickFirstCatalogPickerItem,
  getValidPickerItemTypes,
  isGhostStyled,
  getGhostRect,
  countGhostMarkers,
  isSelectionLabelVisible,
  selectElement,
  settle,
  openTestPage,
} from "../overlay/testing.js";

/** Coverage for the ghost-placeholder visibility contract (previously only
 *  covered by a crash regression, empty-container-crash.e2e.ts). Drives the
 *  demo catalog only: the K1 recipe, adapted to a Stack (its defaultProps
 *  style is `{}` — no padding, unlike Box's 2rem default — so emptying it
 *  actually collapses to a 0x0 rect and gets ghosted, not just "survives").
 *  `panel-stack` (sample-data.json) is a multi-slot Panel with one empty slot
 *  (divider) among filled ones — the case that must NEVER be ghosted. */
test.describe("Ghost placeholder visibility", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  /** Insert a Stack as h1's sibling, then delete both of its default
   *  children (Heading + Text), collapsing it to a genuine 0x0 rect. The
   *  inserted Stack is the only <div> immediately following <h1>. */
  const emptyBoxSelector = "h1 + div";

  /** Select the named text node, delete it, and wait for it to actually leave
   *  the light DOM — the delete's own observable. `settle` then covers the next
   *  input, since the detach resolves the instant the DOM mutates. */
  const deleteTextNode = async (page: Page, copy: string) => {
    const node = page.getByText(copy, { exact: true });
    await selectElement(page, node);
    await page.keyboard.press("Delete");
    await node.waitFor({ state: "detached" });
    await settle(page);
  };

  const insertAndEmptyBox = async (page: Page) => {
    await selectElement(page, page.locator("h1"));
    await page.keyboard.press("/");
    await expect.poll(() => isCatalogPickerVisible(page)).toBe(true);
    await settle(page);

    await page.keyboard.type("Stack");
    // The filter is what the typing produces: wait until Stack heads the valid
    // list, which is exactly the precondition clickFirstCatalogPickerItem needs.
    await expect
      .poll(async () => (await getValidPickerItemTypes(page))[0])
      .toBe("Stack");
    await settle(page);

    const inserted = await clickFirstCatalogPickerItem(page);
    expect(inserted).toBe("Stack");

    await deleteTextNode(page, "Section heading");
    await deleteTextNode(page, "Add your content here.");
  };

  test("an empty container with a collapsed rect gets the ghost marker and measures at least 32x32", async ({
    page,
  }) => {
    await insertAndEmptyBox(page);

    await expect.poll(() => isGhostStyled(page, emptyBoxSelector)).toBe(true);
    const rect = await getGhostRect(page, emptyBoxSelector);
    expect(rect).not.toBeNull();
    expect(rect!.width).toBeGreaterThanOrEqual(32);
    expect(rect!.height).toBeGreaterThanOrEqual(32);
  });

  test("clicking the ghost-expanded area selects it — proves it is actually clickable", async ({
    page,
  }) => {
    await insertAndEmptyBox(page);
    // The expanded rect only exists once the ghost marker is applied.
    await expect.poll(() => isGhostStyled(page, emptyBoxSelector)).toBe(true);
    const rect = await getGhostRect(page, emptyBoxSelector);
    expect(rect).not.toBeNull();

    await page.mouse.click(
      rect!.left + rect!.width / 2,
      rect!.top + rect!.height / 2,
    );

    await expect.poll(() => isSelectionLabelVisible(page)).toBe(true);
  });

  test("inserting a child back removes the ghost marker and restores natural height", async ({
    page,
  }) => {
    await insertAndEmptyBox(page);
    await expect.poll(() => isGhostStyled(page, emptyBoxSelector)).toBe(true);
    const ghostRect = await getGhostRect(page, emptyBoxSelector);
    expect(ghostRect).not.toBeNull();

    // Select the (still empty) Box and insert a child into it.
    await page.mouse.click(
      ghostRect!.left + ghostRect!.width / 2,
      ghostRect!.top + ghostRect!.height / 2,
    );
    await expect.poll(() => isSelectionLabelVisible(page)).toBe(true);
    await settle(page);

    await page.keyboard.press("/");
    await expect.poll(() => isCatalogPickerVisible(page)).toBe(true);
    await settle(page);
    await clickFirstCatalogPickerItem(page);

    // true → false is a real transition: the child unghosts the container.
    await expect.poll(() => isGhostStyled(page, emptyBoxSelector)).toBe(false);
  });

  test("a multi-slot component with one empty slot among filled slots is never ghosted", async ({
    page,
  }) => {
    // panel-stack: head + body + note are filled, divider is empty — the
    // container itself is never a ghost candidate (ghostCandidateIds only
    // qualifies a component when ALL its slots are empty), and no per-slot
    // marker exists either.
    await expect(page.getByText("Stack panel", { exact: true })).toBeVisible();
    expect(await countGhostMarkers(page)).toBe(0);
  });
});
