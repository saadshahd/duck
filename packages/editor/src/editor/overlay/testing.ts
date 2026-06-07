import type { Page, Locator } from "@playwright/test";

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

export const isToolbarVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[role='toolbar']") !== null,
  ) as Promise<boolean>;

export const clickToolbar = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const toolbar = d.shadowRoot.querySelector(
        "[role='toolbar']",
      ) as HTMLElement | null;
      toolbar?.click();
      return;
    }
  });

export const hasToolbarAction = (page: Page, action: string) =>
  page.evaluate((a) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      return (
        d.shadowRoot.querySelector(
          `[role='toolbar'] [data-role='action-${a}']`,
        ) !== null
      );
    }
    return false;
  }, action);

export const clickToolbarAction = (page: Page, action: string) =>
  page.evaluate((a) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const btn = d.shadowRoot.querySelector(
        `[role='toolbar'] [data-role='action-${a}']`,
      ) as HTMLElement | undefined;
      btn?.click();
      return;
    }
  }, action);

// --- Drop indicator helpers ---

export const hasDropIndicator = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='drop-indicator']") !== null,
  ) as Promise<boolean>;

/** The drag overlay's resolution at the current pointer, read in one pass: the
 *  active tile's slot label (when a slot band is aimed), whether the painted
 *  tiles are a discrete marker stack, whether a between-siblings line is shown,
 *  the root-drop label, and the explicit no-target marker. Exactly one of
 *  `tile`/`line`/`root`/`noTarget` is truthy at any pointer position inside a
 *  container — that is the zero-dead-zone invariant. */
export const readResolution = (page: Page) =>
  shadowQuery(page, (r) => {
    const text = (sel: string) =>
      (r.querySelector(sel) as HTMLElement | null)?.textContent ?? null;
    return {
      tile: text("[data-role='slot-tile'][data-active]"),
      discrete:
        r.querySelector("[data-role='slot-tile'][data-discrete]") !== null,
      line: r.querySelector("[data-role='drop-indicator']") !== null,
      root: text("[data-role='root-drop-label']"),
      noTarget: r.querySelector("[data-role='no-target-marker']") !== null,
    };
  }) as Promise<{
    tile: string | null;
    discrete: boolean;
    line: boolean;
    root: string | null;
    noTarget: boolean;
  } | null>;

/** Every painted slot tile with its label and whether it is a discrete marker —
 *  the full set the overlay shows, regardless of which one is active. */
export const readTiles = (page: Page) =>
  shadowQuery(page, (r) =>
    [...r.querySelectorAll("[data-role='slot-tile']")].map((el) => ({
      label: el.textContent ?? "",
      discrete: el.hasAttribute("data-discrete"),
    })),
  ) as Promise<{ label: string; discrete: boolean }[] | null>;

/** Count of slot tiles that carry data-carved (synthetic carved bands). */
export const countCarvedTiles = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelectorAll("[data-role='slot-tile'][data-carved]").length,
  ) as Promise<number | null>;

/** Count of slot-leader elements (one per discrete marker). */
export const countLeaderLines = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelectorAll("[data-role='slot-leader']").length,
  ) as Promise<number | null>;

// --- Slot tile helpers ---

export const getTileLabels = (page: Page) =>
  shadowQuery(page, (r) =>
    [...r.querySelectorAll("[data-role='slot-tile']")].map(
      (el) => el.textContent ?? "",
    ),
  ) as Promise<string[] | null>;

export const getActiveTileLabel = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      (
        r.querySelector(
          "[data-role='slot-tile'][data-active]",
        ) as HTMLElement | null
      )?.textContent ?? null,
  ) as Promise<string | null>;

export const getActiveTileRect = (page: Page) =>
  shadowQuery(page, (r) => {
    const el = r.querySelector(
      "[data-role='slot-tile'][data-active]",
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

/** The currently selected destination's label: an active container tile, or the
 *  root drop marker when the cycle lands on root content. Null when neither. */
export const getActiveDestinationLabel = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      (
        r.querySelector(
          "[data-role='slot-tile'][data-active], [data-role='root-drop-label']",
        ) as HTMLElement | null
      )?.textContent ?? null,
  ) as Promise<string | null>;

// --- Drop zone label helpers ---

export const getDropZoneLabelText = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      (r.querySelector("[data-role='drop-zone-label']") as HTMLElement | null)
        ?.textContent ?? null,
  ) as Promise<string | null>;

export const getDropPositionChipText = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      (
        r.querySelector(
          "[data-role='drop-position-chip']",
        ) as HTMLElement | null
      )?.textContent ?? null,
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

/** Two-step climb: ↑ to slot-stop, then click slot-stop label to land on parent element.
 *  Use when you need the FloatingActionBar (toolbar) visible on the parent. */
export const climbToParent = async (page: Page) => {
  await selectParentElement(page);
  await page.waitForTimeout(300);
  await clickSlotStopLabel(page);
};

export const getSlotAddressText = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      (
        r.querySelector(
          "[data-role='selection-slot-address']",
        ) as HTMLElement | null
      )?.textContent ?? null,
  ) as Promise<string | null>;

export const isSlotStopVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='slot-stop']") !== null,
  ) as Promise<boolean>;

/** Count of selection rings (element selection borders) painted in the overlay. */
export const countSelectionRings = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelectorAll("[data-role='selection-ring']").length,
  ) as Promise<number>;

/** True when the selection label cluster (chip + trailing actions) is mounted. */
export const isSelectionLabelVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='selection-label']") !== null,
  ) as Promise<boolean>;

/** Count of box-model band overlays painted in the overlay. */
export const countBoxModelBands = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelectorAll("[data-role='box-model-bands']").length,
  ) as Promise<number>;

/** One-pass census of the state-owned affordance elements in the overlay. R4's
 *  observer: each interaction state declares a complete, non-overlapping set, so
 *  asserting this whole census per state proves the partition. */
export const readOverlayElements = (page: Page) =>
  shadowQuery(page, (r) => {
    const has = (sel: string) => r.querySelector(sel) !== null;
    const count = (sel: string) => r.querySelectorAll(sel).length;
    return {
      selectionRings: count("[data-role='selection-ring']"),
      labelCluster: has("[data-role='selection-label']"),
      moveChip: has("[data-role='move-chip']"),
      boxModelToggle: has("[data-role='box-model-toggle']"),
      actionBar: has("[role='toolbar']"),
      slotStop: has("[data-role='slot-stop']"),
      slotInsert: has("[data-role='slot-insert-btn']"),
      dropIndicator:
        has("[data-role='drop-indicator']") ||
        has("[data-role='drop-indicator-container']") ||
        count("[data-role='slot-tile']") > 0,
      liftPulse: has("[data-role='lift-pulse']"),
    };
  }) as Promise<{
    selectionRings: number;
    labelCluster: boolean;
    moveChip: boolean;
    boxModelToggle: boolean;
    actionBar: boolean;
    slotStop: boolean;
    slotInsert: boolean;
    dropIndicator: boolean;
    liftPulse: boolean;
  } | null>;

/** Click the box-model toggle in the selection label cluster. */
export const toggleBoxModel = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const btn = d.shadowRoot.querySelector(
        "[data-role='box-model-toggle']",
      ) as HTMLElement | null;
      btn?.click();
      return;
    }
  });

export const getSlotStopLabelText = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      (r.querySelector("[data-role='slot-stop-label']") as HTMLElement | null)
        ?.textContent ?? null,
  ) as Promise<string | null>;

export const clickSlotStopLabel = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const btn = d.shadowRoot.querySelector(
        "[data-role='slot-stop-label']",
      ) as HTMLElement | null;
      btn?.click();
      return;
    }
  });

export const clickSlotInsertBtn = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const btn = d.shadowRoot.querySelector(
        "[data-role='slot-insert-btn']",
      ) as HTMLElement | null;
      btn?.click();
      return;
    }
  });

export const isSlotInsertBtnVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='slot-insert-btn']") !== null,
  ) as Promise<boolean>;

export const isCatalogPickerVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='catalog-picker']") !== null,
  ) as Promise<boolean>;

/** Click the first item in the catalog picker and return the component type name
 *  it represents (the text of the type badge), so callers can assert insertion. */
export const clickFirstCatalogPickerItem = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const item = d.shadowRoot.querySelector(
        "[data-role='catalog-picker-item']",
      ) as HTMLElement | null;
      if (!item) return null;
      const typeName =
        (
          item.querySelector(
            "[data-role='catalog-picker-item-type']",
          ) as HTMLElement | null
        )?.textContent ?? null;
      item.click();
      return typeName;
    }
    return null;
  }) as Promise<string | null>;

export const getSlotStopRect = (page: Page) =>
  shadowQuery(page, (r) => {
    const el = r.querySelector("[data-role='slot-stop']") as HTMLElement | null;
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

// --- Carry helpers ---

export const getMoveChipText = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      (r.querySelector("[data-role='move-chip']") as HTMLElement | null)
        ?.textContent ?? null,
  ) as Promise<string | null>;

export const isMoveChipVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='move-chip']") !== null,
  ) as Promise<boolean>;

export const clickMoveChip = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const btn = d.shadowRoot.querySelector(
        "[data-role='move-chip']",
      ) as HTMLElement | null;
      btn?.click();
      return;
    }
  });

export const isLiftPulseVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='lift-pulse']") !== null,
  ) as Promise<boolean>;

/** The lift pulse's actual on-screen (viewport) bounding box. Reads the rendered
 *  rect rather than inline style so it reflects real positioning after scroll. */
export const getLiftPulseRect = (page: Page) =>
  shadowQuery(page, (r) => {
    const el = r.querySelector("[data-role='lift-pulse']");
    if (!el) return null;
    const box = el.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }) as Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>;

export const isNoTargetFlashVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='carry-no-target-flash']") !== null,
  ) as Promise<boolean>;

// --- Cycle chip helpers ---

export const getCycleChipText = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      (r.querySelector("[data-role='cycle-chip']") as HTMLElement | null)
        ?.textContent ?? null,
  ) as Promise<string | null>;

// --- Drag preview pill helpers ---

/** Arm a recorder for the custom native drag preview pill before starting a drag.
 *  The pill is mounted into light DOM during `onGenerateDragPreview` and removed
 *  the moment the browser snapshots it for the native drag image — it never
 *  survives a turn boundary, so a point-in-time `querySelector` always misses it.
 *  A MutationObserver installed up front captures its text as it is inserted.
 *  Returns a reader that yields the recorded text (or null if never seen). */
export const recordDragPreviewPill = async (
  page: Page,
): Promise<() => Promise<string | null>> => {
  await page.evaluate(() => {
    const w = window as unknown as { __dragPillText?: string | null };
    w.__dragPillText = null;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue;
          const pill = node.matches("[data-role='drag-preview-pill']")
            ? node
            : node.querySelector("[data-role='drag-preview-pill']");
          if (pill) w.__dragPillText = pill.textContent;
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });

  return () =>
    page.evaluate(
      () =>
        (window as unknown as { __dragPillText?: string | null })
          .__dragPillText ?? null,
    );
};

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

// --- Native drag simulation ---

export type Point = { x: number; y: number };

export const sourceCenter = async (source: Locator): Promise<Point> => {
  const box = await source.boundingBox();
  if (!box) throw new Error("Source not visible");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

export const edgePoint = async (
  target: Locator,
  edge: "top" | "bottom",
): Promise<Point> => {
  const box = await target.boundingBox();
  if (!box) throw new Error("Target not visible");
  return {
    x: box.x + box.width / 2,
    y: edge === "top" ? box.y + 2 : box.y + box.height - 2,
  };
};

/**
 * Dispatch native HTML5 drag phases between two points. pragmatic-drag-and-drop
 * uses native drag events with a shared DataTransfer, so each call builds one
 * DataTransfer and fires the phase's events together.
 *
 * - `hold`: dragstart + dragenter + dragover (a drag in progress).
 * - `release`: drop + dragend.
 * - `full`: hold then release in one call (shared DataTransfer).
 *
 * Split `hold` / `release` calls let a test observe mid-drag overlay state.
 */
export const dispatchDrag = (
  page: Page,
  args: { from: Point; to: Point; phase: "hold" | "release" | "full" },
) =>
  page.evaluate(({ from, to, phase }) => {
    const dt = new DataTransfer();
    const opts = (p: { x: number; y: number }): DragEventInit => ({
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: p.x,
      clientY: p.y,
      dataTransfer: dt,
    });
    const src = document.elementFromPoint(from.x, from.y)!;
    const tgt = document.elementFromPoint(to.x, to.y)!;
    if (phase === "hold" || phase === "full") {
      src.dispatchEvent(new DragEvent("dragstart", opts(from)));
      tgt.dispatchEvent(new DragEvent("dragenter", opts(to)));
      tgt.dispatchEvent(new DragEvent("dragover", opts(to)));
    }
    if (phase === "release" || phase === "full") {
      tgt.dispatchEvent(new DragEvent("drop", opts(to)));
      src.dispatchEvent(new DragEvent("dragend", opts(to)));
    }
  }, args);
