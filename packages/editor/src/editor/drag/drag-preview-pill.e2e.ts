import { test, expect, type Page, type Locator } from "@playwright/test";
import { recordDragPreviewPill, sourceCenter } from "../overlay/testing.js";

// --- Helpers ---

/** Begin a real-mouse drag from source, gliding to a waypoint without releasing. */
async function holdDrag(
  page: Page,
  source: Locator,
  waypoint: { x: number; y: number },
) {
  const start = await sourceCenter(source);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(waypoint.x, waypoint.y, { steps: 8 });
  await page.waitForTimeout(80);
}

// --- Drag preview pill ---

test.describe("Custom native drag preview pill", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("drag preview pill text matches the selected element's component type", async ({
    page,
  }) => {
    // Select the heading (Puck type: "Heading") and drag it.
    const heading = page.getByRole("heading", { level: 1 });
    await heading.click();
    await page.waitForTimeout(300);

    const headingBox = await heading.boundingBox();
    if (!headingBox) throw new Error("heading not visible");
    const waypoint = {
      x: headingBox.x + headingBox.width / 2,
      y: headingBox.y + headingBox.height + 60,
    };

    const readPillText = await recordDragPreviewPill(page);
    await holdDrag(page, heading, waypoint);
    const pillText = await readPillText();
    await page.mouse.up();

    // The demo catalog registers the component as "Heading".
    expect(pillText).toBe("Heading");
  });
});
