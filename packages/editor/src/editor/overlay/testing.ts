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

// --- Selection helpers ---

export const selectParentElement = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const chip = d.shadowRoot.querySelector(
        ".element-label--interactive",
      ) as HTMLElement | null;
      chip?.click();
      return;
    }
  });

// --- Morph helpers ---

export const getMorphButtonState = (page: Page) =>
  shadowQuery(page, (r) => {
    const btn = r.querySelector(".morph-btn") as HTMLButtonElement | null;
    if (!btn) return null;
    const badge = btn.querySelector(".morph-badge");
    return {
      disabled: btn.disabled,
      count: badge ? parseInt(badge.textContent ?? "0", 10) : 0,
    };
  }) as Promise<{ disabled: boolean; count: number } | null>;

export const clickMorphButton = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const btn = d.shadowRoot.querySelector(".morph-btn") as
        | HTMLElement
        | undefined;
      btn?.click();
      return;
    }
  });

export const getMorphPickerItems = (page: Page) =>
  shadowQuery(page, (r) => {
    const picker = r.querySelector("[data-role='morph-picker']");
    if (!picker) return null;
    return [...picker.querySelectorAll(".morph-picker-item")].map(
      (el) => el.querySelector(".morph-picker-name")?.textContent ?? "",
    );
  }) as Promise<string[] | null>;

export const clickMorphPickerItem = (page: Page, name: string) =>
  page.evaluate((itemName) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const picker = d.shadowRoot.querySelector("[data-role='morph-picker']");
      if (!picker) continue;
      const items = picker.querySelectorAll(".morph-picker-item");
      for (const item of items) {
        const label = item.querySelector(".morph-picker-name")?.textContent;
        if (label === itemName) {
          (item as HTMLElement).click();
          return;
        }
      }
    }
  }, name);

export const hasMorphOverlay = (page: Page) =>
  page.evaluate(
    () => document.querySelector("[data-role='morph-overlay']") !== null,
  );

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
