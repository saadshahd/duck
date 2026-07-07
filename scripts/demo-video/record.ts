// Record the Duck demo-video master clip.
//
// Story (see story.ts): zero-chrome page -> chrome on intent -> inline heading
// edit -> prop-sheet swatch -> morph quick-variant -> REAL MCP agent edit
// landing live over the bridge -> Cmd+Z revert -> zero-chrome outro.
//
// The agent beat is real: this script spawns the mcp-server (bridge on
// BRIDGE_PORT so the demo wrapper at :5173 auto-connects) and calls
// editor_apply/editor_commit through the MCP client SDK.
//
// Emits out/beats.json: per-beat video timestamps + zoom targets for compose.ts.
//
// Usage: bun run scripts/demo-video/record.ts [baseURL]
import { chromium, type Page } from "playwright";
import { centerOf, clickAt, installCursor, moveTo, ripple } from "./cursor.ts";
import { connectAgent } from "./agent.ts";
import {
  AGENT_COMMIT_LABEL,
  AGENT_OPS,
  BEATS,
  BRIDGE_PORT,
  DESIGNER_DELTAS,
  PAGE,
} from "./story.ts";

const baseURL = process.argv[2] ?? "http://localhost:5173";
const outDir = new URL("./out/", import.meta.url).pathname;
const projectDir = new URL("./project", import.meta.url).pathname;
const VIEWPORT = { width: 1280, height: 800 };

const durations: Record<string, number> = await Bun.file(
  `${outDir}narration/durations.json`,
)
  .json()
  .then((j) => j.durations)
  .catch(() => {
    throw new Error("Run narrate.ts first — beat pacing needs durations.json");
  });

// ── Beat clock ──────────────────────────────────────────────────────

type BeatMark = {
  id: string;
  startMs: number;
  endMs: number;
  zoom?: { x: number; y: number; scale: number };
};

const beatIds = new Set(BEATS.map((b) => b.id));
const marks: BeatMark[] = [];

const makeClock = (page: Page, t0: number) => {
  const now = () => Date.now() - t0;
  return {
    /** Run a beat's actions, then dwell until its narration line has room. */
    async beat(
      id: string,
      actions: () => Promise<{ zoom?: BeatMark["zoom"] } | void>,
    ) {
      if (!beatIds.has(id)) throw new Error(`Unknown beat: ${id}`);
      const spec = BEATS.find((b) => b.id === id)!;
      const startMs = now();
      const result = (await actions()) ?? {};
      const budget = Math.max(spec.minMs, (durations[id] ?? 0) + 700);
      const remaining = startMs + budget - now();
      if (remaining > 0) await page.waitForTimeout(remaining);
      marks.push({ id, startMs, endMs: now(), zoom: result.zoom ?? undefined });
      console.log(`[beat] ${id} ${startMs}ms -> ${now()}ms`);
    },
    now,
  };
};

// ── Drive ───────────────────────────────────────────────────────────

async function main() {
  // A crashed previous run orphans its mcp-server child, which keeps holding
  // the bridge port and silently absorbs this run's browser connection.
  const squatter = Bun.spawnSync([
    "lsof",
    "-t",
    `-iTCP:${BRIDGE_PORT}`,
    "-sTCP:LISTEN",
  ]);
  const pids = squatter.stdout.toString().trim();
  if (pids) {
    console.log(`[setup] killing stale bridge holder(s): ${pids}`);
    for (const pid of pids.split("\n")) process.kill(Number(pid), "SIGTERM");
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log("[setup] starting mcp-server + bridge…");
  const agent = await connectAgent({ projectDir, bridgePort: BRIDGE_PORT });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    recordVideo: { dir: outDir, size: VIEWPORT },
  });

  const page = await context.newPage();
  const t0 = Date.now(); // video capture starts with the page
  await installCursor(page);
  await page.goto(baseURL, { waitUntil: "networkidle" });

  // The browser must be registered with the bridge before the story starts —
  // the agent beat depends on a live connection. The connection dot is
  // selection-gated (zero chrome), so poll the bridge's own viewer count.
  const deadline = Date.now() + 8000;
  while (true) {
    const status = (await fetch(`http://127.0.0.1:${BRIDGE_PORT}/status`).then(
      (r) => r.json(),
    )) as { pages: Record<string, number> };
    if ((status.pages[PAGE] ?? 0) > 0) break;
    if (Date.now() > deadline)
      throw new Error("Browser never registered with the bridge");
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1200); // let fonts/layout settle

  const clock = makeClock(page, t0);
  const h1 = page.locator("h1");
  const marginX = 80; // outside the 1048px page box -> no hover ring

  // (a) Zero chrome: slow drift down the page margin. The page is untouched.
  await clock.beat("zero-chrome", async () => {
    await moveTo(page, { x: marginX, y: 180 }, { durationMs: 900 });
    await page.waitForTimeout(1200);
    await moveTo(page, { x: marginX, y: 520 }, { durationMs: 1400 });
  });

  // (b) Intent: hover shows the ring, click selects.
  await clock.beat("intent", async () => {
    const desc = page.locator("p", { hasText: "Duck brings AI" }).first();
    await moveTo(page, await centerOf(desc));
    await page.waitForTimeout(1300);
    const target = await centerOf(h1);
    await moveTo(page, target);
    await page.waitForTimeout(1100);
    await ripple(page, target);
    await page.mouse.click(target.x, target.y);
    return { zoom: undefined };
  });

  // (c1) Inline edit the hero heading.
  await clock.beat("inline-edit", async () => {
    const target = await centerOf(h1);
    await clickAt(page, target, { clickCount: 2 });
    await page.waitForTimeout(600);
    await page.keyboard.type(DESIGNER_DELTAS.headingText, { delay: 55 });
    await page.waitForTimeout(400);
    await page.keyboard.press("Enter");
    return { zoom: { ...target, scale: 1.45 } };
  });

  // (c2) Prop sheet: one focused surface, element stays visible; swatch tweak.
  await clock.beat("prop-sheet", async () => {
    await clickAt(
      page,
      await centerOf(page.locator("[data-role='action-edit']")),
    );
    await page.locator("[data-role='prop-sheet'][data-open]").waitFor();
    await page.waitForTimeout(900); // slide-in + tether settle
    const swatch = page.locator(
      `[data-role='swatch'] [data-role='swatch-item'][data-value='${DESIGNER_DELTAS.headingColor}']`,
    );
    await swatch.scrollIntoViewIfNeeded();
    const target = await centerOf(swatch);
    await clickAt(page, target);
    await page.waitForTimeout(1400); // heading recolors live
    await page.keyboard.press("Escape"); // close sheet, keep selection
    const h1Center = await centerOf(h1);
    return {
      zoom: { x: (target.x + h1Center.x) / 2, y: h1Center.y, scale: 1.25 },
    };
  });

  // (d) Morph quick-variant on the primary CTA button.
  await clock.beat("morph", async () => {
    const button = page.locator("button", { hasText: "Start building" });
    const buttonCenter = await centerOf(button);
    await clickAt(page, buttonCenter);
    await page.waitForTimeout(700);
    await clickAt(
      page,
      await centerOf(page.locator("[data-role='action-morph']")),
    );
    await page.locator("[data-role='morph-picker']").waitFor();
    await page.waitForTimeout(400);
    const variant = page.locator(
      "[data-role='morph-picker'] .morph-picker-item[data-kind='variant']",
      { hasText: /secondary/i },
    );
    await moveTo(page, await centerOf(variant));
    await variant.hover(); // live preview overlay
    await page.waitForTimeout(1500);
    await clickAt(page, await centerOf(variant));
    await page.waitForTimeout(600);
    return { zoom: { ...buttonCenter, scale: 1.45 } };
  });

  // (e)+(f) The wow: a REAL agent edit lands live over the bridge, then the
  // designer reverts it with Cmd+Z.
  //
  // Real-time constraint: the demo catalog's Text resolveData fires ~1s after
  // any bridge commit; its delayed patch echo RESETS the editor's history
  // (wiping the undo entry) and paints debug "Resolved …" lines. Undoing
  // within <1s of the card landing sidesteps both — the patches land on a
  // non-current history entry and never touch the screen. Composition
  // extends the card's on-screen life with a freeze-frame (see freeze mark).
  let freeze: { atMs: number } | null = null;
  {
    const agentStart = clock.now();
    await page.keyboard.press("Escape"); // zero chrome while the agent works
    await moveTo(page, { x: marginX, y: 600 }, { durationMs: 500 });
    // Position the grid so its second row (where the new card lands) is visible.
    const featuresHeading = page.locator("h2", {
      hasText: "What makes it different",
    });
    const headingBox = await featuresHeading.boundingBox();
    if (headingBox) {
      await page.mouse.wheel(0, headingBox.y - 80);
      await page.waitForTimeout(900);
    }
    await agent.apply(PAGE, AGENT_OPS as unknown as unknown[]);
    await agent.commit(PAGE, AGENT_COMMIT_LABEL);
    const card = page.locator("h3", { hasText: "Live Bridge" });
    await card.waitFor({ timeout: 5000 });
    const cardShownMs = clock.now();
    freeze = { atMs: cardShownMs + 400 };
    const headingCenter = await centerOf(card);
    const target = { x: headingCenter.x, y: headingCenter.y + 60 };
    await page.waitForTimeout(650);
    const undoStart = clock.now();
    marks.push({
      id: "agent",
      startMs: agentStart,
      endMs: undoStart,
      zoom: { ...target, scale: 1.35 },
    });
    console.log(`[beat] agent ${agentStart}ms -> ${undoStart}ms`);

    // Cmd+Z before the 1s resolution window closes. A broadcast race can
    // leave two history entries; retry until the card is actually gone.
    for (let i = 0; i < 3 && (await card.count()); i++) {
      await page.keyboard.press("Meta+z");
      await page.waitForTimeout(250);
    }
    await card.waitFor({ state: "detached", timeout: 3000 });
    await page.waitForTimeout(
      Math.max(BEATS.find((b) => b.id === "undo")!.minMs, durations.undo + 700),
    );
    marks.push({ id: "undo", startMs: undoStart, endMs: clock.now() });
    console.log(`[beat] undo ${undoStart}ms -> ${clock.now()}ms`);
  }

  // (g) Outro: back to the top, untouched-looking page, zero chrome.
  await clock.beat("outro", async () => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(1000);
    await moveTo(page, { x: marginX, y: 300 }, { durationMs: 900 });
  });

  const video = page.video();
  await context.close(); // flushes the video file
  await browser.close();
  await agent.close();

  const videoPath = await video?.path();
  await Bun.write(
    `${outDir}beats.json`,
    JSON.stringify(
      { viewport: VIEWPORT, videoPath, freeze, beats: marks },
      null,
      2,
    ),
  );
  console.log(`[done] video: ${videoPath}`);
  console.log(`[done] beats: ${outDir}beats.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
