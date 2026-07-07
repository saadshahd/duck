// Synthetic pointer overlay for recorded footage.
//
// Playwright's installed version (1.58.2) has no screencast/pointer-decoration
// API — only `recordVideo`, which captures raw frames with no visible cursor.
// This injects a CSS-only SVG arrow cursor into the *main document* (a sibling
// of Duck's shadow-DOM overlay host, never inside it) and moves it in lockstep
// with real `page.mouse.move` calls, so recorded clips show motion.
//
// Travel model: fixed-duration ease-out cubic (~250–400ms scaled by distance),
// so long hops stay quick and the approach decelerates like a human hand.
import type { Page } from "playwright";

const CURSOR_ID = "__demo-video-cursor__";

// macOS-style arrow: white fill, dark outline, soft drop shadow.
const ARROW_SVG = `
<svg width="26" height="30" viewBox="0 0 26 30" xmlns="http://www.w3.org/2000/svg">
  <g filter="drop-shadow(0 1.5px 2.5px rgba(0,0,0,0.45))">
    <path d="M4 2 L4 23 L9.2 18.4 L12.6 26 L16.4 24.3 L13 16.9 L20 16.6 Z"
          fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/>
  </g>
</svg>`.trim();

const cursorInitScript = `
(() => {
  const install = () => {
    if (document.getElementById("${CURSOR_ID}")) return;
    const el = document.createElement("div");
    el.id = "${CURSOR_ID}";
    el.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "width:26px",
      "height:30px",
      "pointer-events:none",
      "z-index:2147483647",
      "transform:translate(-4px,-2px)",
    ].join(";");
    el.innerHTML = ${JSON.stringify(ARROW_SVG)};
    const style = document.createElement("style");
    style.textContent = [
      "@keyframes __demo_ripple {",
      "  from { transform: translate(-50%,-50%) scale(0.35); opacity: 0.55; }",
      "  to   { transform: translate(-50%,-50%) scale(1); opacity: 0; }",
      "}",
    ].join("\\n");
    document.head.appendChild(style);
    document.body.appendChild(el);
  };
  if (document.body) install();
  else document.addEventListener("DOMContentLoaded", install);
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

/** Expanding ring at the click point; removes itself when the animation ends. */
export const ripple = (page: Page, at: { x: number; y: number }) =>
  page.evaluate(
    ([x, y]) => {
      const el = document.createElement("div");
      el.style.cssText = [
        "position:fixed",
        `left:${x}px`,
        `top:${y}px`,
        "width:34px",
        "height:34px",
        "border-radius:50%",
        "border:2.5px solid rgba(17,17,17,0.75)",
        "background:rgba(17,17,17,0.12)",
        "pointer-events:none",
        "z-index:2147483646",
        "animation:__demo_ripple 380ms ease-out forwards",
      ].join(";");
      document.body.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
      setTimeout(() => el.remove(), 600);
    },
    [at.x, at.y],
  );

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const currentPosition = (page: Page) =>
  page.evaluate((id) => {
    const el = document.getElementById(id);
    return {
      x: el ? parseFloat(el.style.left || "0") : 0,
      y: el ? parseFloat(el.style.top || "0") : 0,
    };
  }, CURSOR_ID);

/** Travel duration: 250ms for short hops, up to 420ms across the viewport. */
const travelMs = (distance: number) =>
  Math.round(250 + 170 * Math.min(distance / 900, 1));

const FRAME_MS = 12;

/** Move the real mouse and the synthetic cursor together: quick ease-out glide. */
export const moveTo = async (
  page: Page,
  to: { x: number; y: number },
  opts: { durationMs?: number } = {},
) => {
  const from = await currentPosition(page);
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  if (distance < 1) return;
  const duration = opts.durationMs ?? travelMs(distance);
  const steps = Math.max(2, Math.round(duration / FRAME_MS));

  for (let i = 1; i <= steps; i++) {
    const t = easeOutCubic(i / steps);
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    await page.mouse.move(x, y);
    await setCursorPosition(page, x, y);
    await page.waitForTimeout(FRAME_MS);
  }
};

/** Glide to the point, then click with a visible ripple. */
export const clickAt = async (
  page: Page,
  at: { x: number; y: number },
  opts: { clickCount?: number } = {},
) => {
  await moveTo(page, at);
  await ripple(page, at);
  await page.mouse.click(at.x, at.y, { clickCount: opts.clickCount ?? 1 });
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
