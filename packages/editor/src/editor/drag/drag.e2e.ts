import { test, expect, type Page, type Locator } from "@playwright/test";
import { hasDropIndicator } from "../overlay/testing.js";

/**
 * Simulate a full native drag-and-drop sequence.
 * pragmatic-drag-and-drop uses native HTML5 drag events with a shared DataTransfer.
 * We dispatch all events in a single evaluate call to share the DataTransfer instance.
 */
async function dragAndDrop(
  page: Page,
  source: Locator,
  target: Locator,
  targetEdge: "top" | "bottom" = "bottom",
) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Elements not visible");

  const sx = sourceBox.x + sourceBox.width / 2;
  const sy = sourceBox.y + sourceBox.height / 2;
  const tx = targetBox.x + targetBox.width / 2;
  const ty =
    targetEdge === "top" ? targetBox.y + 2 : targetBox.y + targetBox.height - 2;

  await page.evaluate(
    ({ sx, sy, tx, ty }) => {
      const dt = new DataTransfer();
      const opts = (x: number, y: number): DragEventInit => ({
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        dataTransfer: dt,
      });

      const src = document.elementFromPoint(sx, sy)!;
      const tgt = document.elementFromPoint(tx, ty)!;

      src.dispatchEvent(new DragEvent("dragstart", opts(sx, sy)));
      tgt.dispatchEvent(new DragEvent("dragenter", opts(tx, ty)));
      tgt.dispatchEvent(new DragEvent("dragover", opts(tx, ty)));
      tgt.dispatchEvent(new DragEvent("drop", opts(tx, ty)));
      src.dispatchEvent(new DragEvent("dragend", opts(tx, ty)));
    },
    { sx, sy, tx, ty },
  );
}

/** Start a drag without dropping — for testing indicators. */
async function dragOver(page: Page, source: Locator, target: Locator) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Elements not visible");

  const sx = sourceBox.x + sourceBox.width / 2;
  const sy = sourceBox.y + sourceBox.height / 2;
  const tx = targetBox.x + targetBox.width / 2;
  const ty = targetBox.y + targetBox.height - 2;

  await page.evaluate(
    ({ sx, sy, tx, ty }) => {
      const dt = new DataTransfer();
      const opts = (x: number, y: number): DragEventInit => ({
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        dataTransfer: dt,
      });

      const src = document.elementFromPoint(sx, sy)!;
      const tgt = document.elementFromPoint(tx, ty)!;

      src.dispatchEvent(new DragEvent("dragstart", opts(sx, sy)));
      tgt.dispatchEvent(new DragEvent("dragenter", opts(tx, ty)));
      tgt.dispatchEvent(new DragEvent("dragover", opts(tx, ty)));
    },
    { sx, sy, tx, ty },
  );
}

test.describe("Drag-to-reorder", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("selected element gets draggable attribute", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);
    expect(await heading.getAttribute("draggable")).toBe("true");
  });

  test("drag over sibling shows drop indicator", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    const description = page.getByText("A zero-chrome editor", {
      exact: false,
    });
    await dragOver(page, heading, description);
    await page.waitForTimeout(300);

    expect(await hasDropIndicator(page)).toBe(true);
  });

  test("drop reorders elements", async ({ page }) => {
    // Get initial text order in the hero section
    const heading = page.locator("h1");
    const heroSection = heading.locator("..");
    const initialFirst = await heroSection.locator("> *").first().textContent();

    // Select heading
    await heading.click();
    await page.waitForTimeout(300);

    // Drag heading to below the description (second sibling)
    const description = page.getByText("A zero-chrome editor", {
      exact: false,
    });
    await dragAndDrop(page, heading, description, "bottom");
    await page.waitForTimeout(500);

    // After reorder, heading should no longer be the first child
    const newFirst = await heroSection.locator("> *").first().textContent();
    expect(newFirst).not.toBe(initialFirst);
  });

  test("cannot drag while editing", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    // Double-click to enter inline edit
    await heading.dblclick();
    await page.waitForTimeout(300);

    // Element should not be draggable during edit
    const draggable = await heading.getAttribute("draggable");
    expect(draggable).not.toBe("true");
  });

  test("second drag works after first drop", async ({ page }) => {
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    const description = page.getByText("A zero-chrome editor", {
      exact: false,
    });
    await dragAndDrop(page, heading, description, "bottom");
    await page.waitForTimeout(500);

    // Re-select (now the description is first)
    await description.click();
    await page.waitForTimeout(300);

    // Should be able to drag again
    expect(await description.getAttribute("draggable")).toBe("true");

    // Drag back
    const movedHeading = page.locator("h1");
    await dragAndDrop(page, description, movedHeading, "top");
    await page.waitForTimeout(500);
  });
});
