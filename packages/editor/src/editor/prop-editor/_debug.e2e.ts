import { test, expect } from "@playwright/test";
import { clickToolbarAction, isSheetVisible } from "../overlay/testing.js";

test("debug observer 6 click positions", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(500);

  await page.locator("h1").click();
  await page.waitForTimeout(200);
  await clickToolbarAction(page, "edit");
  await page.waitForTimeout(400);

  // Find the bottom of the page content and try a click below it
  const pageInfo = await page.evaluate(() => {
    // Get the bottom of document
    const docHeight = document.body.scrollHeight;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    
    // Check several positions
    const positions = [
      { x: 2, y: 2 },
      { x: 640, y: 715 }, // bottom center of viewport
      { x: 2, y: 715 },   // bottom left
    ];
    
    return positions.map(({x, y}) => {
      const el = document.elementFromPoint(x, y);
      const id = el ? (el as HTMLElement).dataset.puckId ?? el?.id ?? el?.tagName ?? "?" : "NULL";
      return { x, y, tag: el?.tagName ?? "NULL", id };
    }).concat([{ x: 0, y: 0, tag: "info", id: `docH:${docHeight} vh:${viewportH} vw:${viewportW}` }]);
  });
  console.log("DEBUG positions:", JSON.stringify(pageInfo, null, 2));
});
