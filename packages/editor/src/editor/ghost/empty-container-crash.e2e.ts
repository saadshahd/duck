import { test, expect, type Page } from "@playwright/test";
import {
  isCatalogPickerVisible,
  clickFirstCatalogPickerItem,
  selectElement,
  settle,
  openTestPage,
} from "../overlay/testing.js";

/** BLOCKER repro (Smoke test findings): a container collapsing to zero children
 *  (a ghost candidate) crashed the whole editor with "React has detected a
 *  change in the order of Hooks called by Editor" -> unmount -> blank page,
 *  session lost. This pins the repro: insert a Box (two default children),
 *  delete both children, and the editor must survive — rendered page intact,
 *  no React hook-order warning, no page crash. */
test.describe("Empty-container ghost path does not crash the editor", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  const collectErrors = (page: Page) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    return { consoleErrors, pageErrors };
  };

  /** Insert the first catalog offer as a sibling of the current selection.
   *  Returns the inserted component's type name. */
  const insertFirstOffer = async (page: Page) => {
    await page.keyboard.press("/");
    await expect.poll(() => isCatalogPickerVisible(page)).toBe(true);
    await settle(page);
    return clickFirstCatalogPickerItem(page);
  };

  /** Select the named text node and delete it, waiting for it to actually leave
   *  the light DOM. The hook-order crash this suite guards renders synchronously
   *  with that removal, so the detach is a sufficient observer for it — a
   *  crashed editor unmounts the tree instead of re-rendering it. */
  const deleteTextNode = async (page: Page, copy: string) => {
    const node = page.getByText(copy, { exact: true });
    await selectElement(page, node);
    await page.keyboard.press("Delete");
    await node.waitFor({ state: "detached" });
    await settle(page);
  };

  test("deleting all children of a container survives — no hook-order crash", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);

    // Insert a Box (default children: Heading "Section heading" + Text "Add
    // your content here.") as a sibling of the hero heading.
    await selectElement(page, page.locator("h1"));
    expect(await insertFirstOffer(page)).toBe("Box");

    // Delete the Box's two default children one at a time — the second delete
    // collapses the Box to zero children (a ghost candidate).
    await deleteTextNode(page, "Section heading");
    await deleteTextNode(page, "Add your content here.");

    // The editor must still be alive: the hero heading (untouched sibling) is
    // still rendered — a crash unmounts the whole tree to a blank page.
    await expect(page.locator("h1")).toBeVisible();

    const hookOrderWarning = consoleErrors.find((m) =>
      m.includes("change in the order of Hooks"),
    );
    expect(hookOrderWarning).toBeUndefined();
    expect(pageErrors).toEqual([]);
  });

  test("emptying a Box inside a Card body slot survives — original smoke-test repro", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);

    // Exact smoke-test path: select a card-body Text, insert a Box as its
    // sibling inside the Card body slot, then delete the Box's two default
    // children — the Box collapses to a ghost candidate inside the slot.
    await selectElement(
      page,
      page.getByText("No panels, no toolbars.", { exact: false }),
    );
    expect(await insertFirstOffer(page)).toBe("Box");

    await deleteTextNode(page, "Section heading");
    await deleteTextNode(page, "Add your content here.");

    await expect(page.locator("h1")).toBeVisible();

    const hookOrderWarning = consoleErrors.find((m) =>
      m.includes("change in the order of Hooks"),
    );
    expect(hookOrderWarning).toBeUndefined();
    expect(pageErrors).toEqual([]);
  });
});
