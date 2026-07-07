// Stage-1 spike: drive the Duck demo editor and capture a raw clip.
//
// Flow: hover heading -> select -> inline-edit its text -> select a second
// element -> deselect. Proves the synthetic pointer (see cursor.ts) tracks
// real interaction against Duck's open-mode shadow-DOM overlay.
//
// Usage: bun run scripts/demo-video/record.ts [baseURL]
import { chromium } from "playwright";
import { installCursor, moveTo, centerOf } from "./cursor.ts";

const baseURL = process.argv[2] ?? "http://localhost:5173";
const outDir = new URL("./out/", import.meta.url).pathname;

const wait = (page: import("playwright").Page, ms: number) =>
  page.waitForTimeout(ms);

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    // recordVideo only downscales to fit `size` — it never upscales past the
    // captured (logical, CSS-pixel) frame. Setting size above the viewport
    // letterboxes with gray padding instead of supersampling. Keep size ==
    // viewport; deviceScaleFactor still sharpens antialiasing/text render.
    recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
  });

  const page = await context.newPage();
  await installCursor(page);
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await wait(page, 2500);

  const heading = page.locator("h1").first();
  await moveTo(page, await centerOf(heading));
  await wait(page, 1500); // let the hover-highlight register

  await heading.click();
  await wait(page, 2500); // selection ring + toolbar

  await heading.dblclick();
  await wait(page, 700); // enters contenteditable

  await page.keyboard.press("Meta+a");
  await page.keyboard.type("Duck ships the demo.", { delay: 60 });
  await page.keyboard.press("Enter");
  await wait(page, 3000); // commit + canvas update

  // Best-effort quick action: morph, if the selected element has any.
  await heading.click();
  await wait(page, 800);
  const morphButton = page.locator("[data-role='action-morph']").first();
  if (await morphButton.count()) {
    await moveTo(page, await centerOf(morphButton), { steps: 25 });
    await morphButton.click();
    await wait(page, 800);
    const firstVariant = page
      .locator("[data-role='morph-picker'] [role='menuitem']")
      .first();
    if (await firstVariant.count()) {
      await moveTo(page, await centerOf(firstVariant), { steps: 20 });
      await wait(page, 1500); // hover preview
      await firstVariant.click();
      await wait(page, 2000); // commit
    } else {
      await page.keyboard.press("Escape");
      await wait(page, 500);
    }
  }

  const description = page
    .locator("#hero-description, [id='hero-description']")
    .first();
  const descTarget = (await description.count())
    ? await centerOf(description)
    : await centerOf(page.locator("p").first());
  await moveTo(page, descTarget, { steps: 50 });
  await wait(page, 2000);
  await page.mouse.click(descTarget.x, descTarget.y);
  await wait(page, 3200); // second selection re-targets the one control surface

  // Deselect: click empty canvas margin.
  await page.mouse.click(20, 20);
  await wait(page, 3800);

  await context.close(); // flushes the video file
  await browser.close();

  console.log(`Recorded clip in ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
