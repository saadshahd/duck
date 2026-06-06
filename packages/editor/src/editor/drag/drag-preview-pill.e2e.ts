import { test, expect, type Page, type Locator } from "@playwright/test";
import { getDragPreviewPillText, sourceCenter } from "../overlay/testing.js";

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

  test("drag preview pill mounts with the dragged component's type name", async ({
    page,
  }) => {
    // Select the heading so the draggable affordance attaches.
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    // The heading component renders a Heading element — its Puck type name is
    // "Heading". Derive a waypoint one viewport row below so the drag clears the
    // source element and pragmatic-dnd fires onGenerateDragPreview.
    const headingBox = await heading.boundingBox();
    if (!headingBox) throw new Error("h1 not visible");
    const waypoint = {
      x: headingBox.x + headingBox.width / 2,
      y: headingBox.y + headingBox.height + 60,
    };

    await holdDrag(page, heading, waypoint);

    // The pill is mounted in document.body (light DOM) by setCustomNativeDragPreview
    // at onGenerateDragPreview time. It must carry the component type name.
    const pillText = await getDragPreviewPillText(page);
    await page.mouse.up();

    expect(pillText, "drag preview pill must be present").not.toBeNull();
    // The pill text is the Puck component type name, which is a non-empty string.
    expect(pillText!.length, "pill text must be non-empty").toBeGreaterThan(0);
    // The type name must not be a raw element id (UUIDs contain dashes and are 36
    // chars). A component type name is a short, human-readable identifier.
    expect(
      pillText!,
      "pill text should be a component type name, not a raw element id",
    ).toMatch(/^[A-Za-z]/);
  });

  test("drag preview pill text matches the selected element's component type", async ({
    page,
  }) => {
    // Select the heading (Puck type: "Heading") and drag it.
    const heading = page.locator("h1");
    await heading.click();
    await page.waitForTimeout(300);

    const headingBox = await heading.boundingBox();
    if (!headingBox) throw new Error("h1 not visible");
    const waypoint = {
      x: headingBox.x + headingBox.width / 2,
      y: headingBox.y + headingBox.height + 60,
    };

    await holdDrag(page, heading, waypoint);
    const pillText = await getDragPreviewPillText(page);
    await page.mouse.up();

    // The demo catalog registers the component as "Heading".
    expect(pillText).toBe("Heading");
  });
});
