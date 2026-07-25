import { test, expect } from "@playwright/test";
import {
  FIX,
  selectByTestId,
  getHighlightRect,
  getPageElementBox,
  toggleBoxModel,
  countBoxModelBands,
  selectParentElement,
  countSelectionRings,
  isToolbarVisible,
  settle,
  openTestPage,
} from "../overlay/testing.js";

/** Ticket 114 slice 2 — the derisk scenario proven live. A pre-slice-1 HEAD
 *  resolved a click inside an array-item slot (`Sections.items[i].content`)
 *  to the array HOLDER, because `buildIndex`/`findParent` only walked
 *  top-level slot keys. Slices 1+1b generalized the address model to
 *  prop-paths, so the tree walk now descends into array-item slots — this
 *  file is the behavioural proof, requiring zero fiber/overlay changes. */

const closeTo = (a: number, b: number, tolerance = 6) =>
  Math.abs(a - b) <= tolerance;

test.describe("Array-item slot selection", () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test("clicking a component inside an array-item slot selects the nested child, not the array holder", async ({
    page,
  }) => {
    // selectByTestId clicks and settles — the ring is anchored when it returns.
    await selectByTestId(page, FIX.sections.childId);

    const childBox = await getPageElementBox(
      page,
      `[data-testid='${FIX.sections.childId}']`,
    );
    const holderBox = await getPageElementBox(
      page,
      `[data-testid='${FIX.sections.id}']`,
    );
    const ring = await getHighlightRect(page);
    expect(childBox).not.toBeNull();
    expect(holderBox).not.toBeNull();
    expect(ring).not.toBeNull();

    const ringHeight = parseFloat(ring!.height);
    const childHeight = childBox!.bottom - childBox!.top;
    const holderHeight = holderBox!.bottom - holderBox!.top;

    // The holder wraps its own heading PLUS this child, so it is strictly
    // taller — a reliable signal that the ring hugs the child, not the holder.
    expect(holderHeight).toBeGreaterThan(childHeight + 6);
    expect(closeTo(ringHeight, childHeight)).toBe(true);
    expect(closeTo(parseFloat(ring!.top), childBox!.top)).toBe(true);

    expect(await countSelectionRings(page)).toBe(1);
    expect(await isToolbarVisible(page)).toBe(true);
  });

  test("box-model bands render on the nested child when selected", async ({
    page,
  }) => {
    await selectByTestId(page, FIX.sections.childId);

    await toggleBoxModel(page);
    await settle(page);

    expect(await countBoxModelBands(page)).toBeGreaterThan(0);
  });

  test("select-parent from the nested child climbs to the array holder (Sections)", async ({
    page,
  }) => {
    await selectByTestId(page, FIX.sections.childId);

    await selectParentElement(page);
    // A climb retargets the existing ring — the ring COUNT is unchanged, so
    // there is nothing to poll for; settle covers the re-anchor pass.
    await settle(page);

    const holderBox = await getPageElementBox(
      page,
      `[data-testid='${FIX.sections.id}']`,
    );
    const ring = await getHighlightRect(page);
    expect(holderBox).not.toBeNull();
    expect(ring).not.toBeNull();

    const holderHeight = holderBox!.bottom - holderBox!.top;
    expect(closeTo(parseFloat(ring!.height), holderHeight)).toBe(true);
    expect(closeTo(parseFloat(ring!.top), holderBox!.top)).toBe(true);

    expect(await countSelectionRings(page)).toBe(1);
    expect(await isToolbarVisible(page)).toBe(true);
  });
});
