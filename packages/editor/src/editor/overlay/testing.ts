import type { Page } from "@playwright/test";

// --- Shadow DOM access ---

/** Evaluate a function against the editor overlay's shadow root. */
async function shadowQuery<T>(
  page: Page,
  fn: (root: ShadowRoot) => T,
): Promise<T | null> {
  return page.evaluate((fnStr) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      return new Function("root", `return (${fnStr})(root)`)(d.shadowRoot);
    }
    return null;
  }, fn.toString()) as Promise<T | null>;
}

// --- Role-based query helpers ---

export const countHighlights = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r.querySelectorAll(
        "[data-role='hover-highlight'], [data-role='selection-ring']",
      ).length,
  ) as Promise<number>;

export const getHighlightRect = (page: Page) =>
  shadowQuery(page, (r) => {
    const el = r.querySelector(
      "[data-role='hover-highlight'], [data-role='selection-ring']",
    ) as HTMLElement | null;
    if (!el) return null;
    return {
      top: el.style.top,
      left: el.style.left,
      width: el.style.width,
      height: el.style.height,
    };
  }) as Promise<{
    top: string;
    left: string;
    width: string;
    height: string;
  } | null>;

export const countToolbarButtons = (page: Page) =>
  shadowQuery(page, (r) => {
    const toolbar = r.querySelector("[role='toolbar']");
    return toolbar ? toolbar.querySelectorAll("button").length : 0;
  }) as Promise<number>;

export const clickToolbarButton = (page: Page, index = 0) =>
  page.evaluate((idx) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const toolbar = d.shadowRoot.querySelector("[role='toolbar']");
      const btn = toolbar?.querySelectorAll("button")[idx] as
        | HTMLElement
        | undefined;
      btn?.click();
      return;
    }
  }, index);

// --- Drop indicator helpers ---

export const hasDropIndicator = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='drop-indicator']") !== null,
  ) as Promise<boolean>;

const getDropIndicatorRect = (page: Page) =>
  shadowQuery(page, (r) => {
    const el = r.querySelector(
      "[data-role='drop-indicator']",
    ) as HTMLElement | null;
    if (!el) return null;
    return { top: el.style.top, left: el.style.left, width: el.style.width };
  }) as Promise<{ top: string; left: string; width: string } | null>;

// --- Drop zone label helpers ---

export const getDropZoneLabelText = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      (r.querySelector(".drop-zone-label") as HTMLElement | null)
        ?.textContent ?? null,
  ) as Promise<string | null>;

// --- Animation & measurement helpers ---

/** Wait for exactly N animation frames to elapse. */
export const waitFrames = (page: Page, count: number) =>
  page.evaluate(
    (n) =>
      new Promise<void>((resolve) => {
        let remaining = n;
        const tick = () =>
          --remaining > 0 ? requestAnimationFrame(tick) : resolve();
        requestAnimationFrame(tick);
      }),
    count,
  );
