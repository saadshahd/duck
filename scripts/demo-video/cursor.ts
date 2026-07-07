// Synthetic pointer overlay for recorded footage.
//
// Playwright's installed version (1.58.2) has no screencast/pointer-decoration
// API — only `recordVideo`, which captures raw frames with no visible cursor.
// This injects a CSS-only cursor div into the *main document* (a sibling of
// Duck's shadow-DOM overlay host, never inside it) and moves it in lockstep
// with real `page.mouse.move` calls, so recorded clips show motion.
import type { Page } from "playwright";

const CURSOR_ID = "__demo-video-cursor__";

const cursorInitScript = `
(() => {
  const el = document.createElement("div");
  el.id = "${CURSOR_ID}";
  el.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "width:18px",
    "height:18px",
    "border-radius:50%",
    "background:rgba(255,90,36,0.85)",
    "box-shadow:0 0 0 3px rgba(255,90,36,0.25),0 1px 4px rgba(0,0,0,0.4)",
    "pointer-events:none",
    "z-index:2147483647",
    "transform:translate(-50%,-50%)",
    "transition:left 16ms linear,top 16ms linear",
  ].join(";");
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(el));
  if (document.body) document.body.appendChild(el);
})();
`;

/** Install the synthetic cursor before any navigation happens. */
export const installCursor = (page: Page) =>
  page.addInitScript(cursorInitScript);

const setCursorPosition = (page: Page, x: number, y: number) =>
  page.evaluate(
    ([cx, cy, id]) => {
      const el = document.getElementById(id as string);
      if (!el) return;
      el.style.left = `${cx}px`;
      el.style.top = `${cy}px`;
    },
    [x, y, CURSOR_ID],
  );

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** Move the real mouse and the synthetic cursor together, in interpolated steps. */
export const moveTo = async (
  page: Page,
  to: { x: number; y: number },
  opts: { steps?: number; frameDelayMs?: number } = {},
) => {
  const steps = opts.steps ?? 40;
  const frameDelayMs = opts.frameDelayMs ?? 12;
  const from = await page.evaluate(() => {
    const el = document.getElementById("__demo-video-cursor__");
    return {
      x: el ? parseFloat(el.style.left || "0") : 0,
      y: el ? parseFloat(el.style.top || "0") : 0,
    };
  });

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = lerp(from.x, to.x, t);
    const y = lerp(from.y, to.y, t);
    await page.mouse.move(x, y);
    await setCursorPosition(page, x, y);
    await page.waitForTimeout(frameDelayMs);
  }
};

/** Center-point of an element's bounding box, for moveTo targets. */
export const centerOf = async (locator: {
  boundingBox: () => Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>;
}) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Element has no bounding box — is it visible?");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};
