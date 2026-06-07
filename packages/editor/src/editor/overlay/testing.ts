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

/** Every painted slot tile's label and its on-screen (viewport) bounding box,
 *  read from the rendered element so it reflects real layout. The y-midpoint of
 *  a discrete marker is what the panel law pins to the slot's child rect. */
export const readTileRects = (page: Page) =>
  shadowQuery(page, (r) =>
    [...r.querySelectorAll("[data-role='slot-tile']")].map((el) => {
      const box = el.getBoundingClientRect();
      return {
        label: el.textContent ?? "",
        top: box.top,
        left: box.left,
        bottom: box.bottom,
        right: box.right,
      };
    }),
  ) as Promise<
    | {
        label: string;
        top: number;
        left: number;
        bottom: number;
        right: number;
      }[]
    | null
  >;

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

/** The currently resolved destination's name, read from the single move ghost —
 *  the one element that owns the resolved-destination datum across drag and carry.
 *  Null over a dead zone (a blocked ghost names no destination). */
export const getActiveDestinationLabel = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      (
        r.querySelector(
          "[data-role='move-ghost-destination']",
        ) as HTMLElement | null
      )?.textContent ?? null,
  ) as Promise<string | null>;

// --- Move ghost helpers ---

/** The single pointer-anchored move ghost's full reading: the source component
 *  type, the resolved destination name (null when blocked), and validity. The one
 *  element that names the move across both drag and carry. Null when absent. */
export const readMoveGhost = (page: Page) =>
  shadowQuery(page, (r) => {
    const ghost = r.querySelector("[data-role='move-ghost']");
    if (!ghost) return null;
    const text = (sel: string) =>
      (ghost.querySelector(sel) as HTMLElement | null)?.textContent ?? null;
    return {
      sourceType: text(".move-ghost-source"),
      destination: text("[data-role='move-ghost-destination']"),
      valid: ghost.hasAttribute("data-valid"),
    };
  }) as Promise<{
    sourceType: string | null;
    destination: string | null;
    valid: boolean;
  } | null>;

/** The move ghost's on-screen position — its top-left viewport coordinates. Two
 *  readings at two pointer positions prove the ghost follows the pointer. */
export const getMoveGhostPosition = (page: Page) =>
  shadowQuery(page, (r) => {
    const el = r.querySelector("[data-role='move-ghost']");
    if (!el) return null;
    const box = el.getBoundingClientRect();
    return { x: box.x, y: box.y };
  }) as Promise<{ x: number; y: number } | null>;

/** Count of elements in the overlay whose trimmed text equals the destination
 *  name. R4's observer for the resolved-destination datum: exactly one during a
 *  move (the ghost's destination span), proving no other element re-paints it.
 *  Tiles name candidate slots, not the resolution — a same-named tile is allowed,
 *  so this counts only the ghost's own destination element by data-role. */
export const countDestinationText = (page: Page, name: string) =>
  page.evaluate((n) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      return [
        ...d.shadowRoot.querySelectorAll(
          "[data-role='move-ghost-destination']",
        ),
      ].filter((el) => (el.textContent ?? "").trim() === n).length;
    }
    return 0;
  }, name) as Promise<number>;

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

/** Climb to the parent node. Climb is pure node→node navigation: one ↑ click on
 *  the chip selects the parent element directly (it never enters slot-selected).
 *  Use when you need the FloatingActionBar (toolbar) visible on the parent. */
export const climbToParent = async (page: Page) => {
  await selectParentElement(page);
  await page.waitForTimeout(300);
};

/** Enter the insert slot-choice step (slot-selected) on a multi-slot node: climb
 *  to the node, then open insert with `/`. The only path to slot-selected now
 *  that climb navigates nodes only — the slot bands belong to the insert flow. */
export const enterSlotChoice = async (page: Page) => {
  await selectParentElement(page);
  await page.waitForTimeout(300);
  await page.keyboard.press("/");
  await page.waitForTimeout(300);
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

/** Count of overlay elements that name the SELECTED slot — the chip's slot
 *  address line plus the active slot-stop label. Sibling (choosable) slot-stop
 *  labels name other, candidate slots and are excluded. R12's one-painter
 *  observer: exactly one may name the selected slot per state (the chip in
 *  resting-selected, the active slot-stop in slot-selected), never both. */
export const countSelectedSlotNamers = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r.querySelectorAll(
        "[data-role='selection-slot-address'], [data-role='slot-stop-label'][data-active]",
      ).length,
  ) as Promise<number>;

/** A stable census of the rendered page's light-DOM elements by tag. The editor
 *  overlay lives in a shadow root, so a light-DOM query never counts overlay
 *  affordances — only the document the spec renders. A direct observer that an
 *  insert flow has NOT written: the census must be identical before the action
 *  and while a slot is merely being chosen. */
export const pageContentCensus = (page: Page) =>
  page.evaluate(() => {
    const tags = ["h1", "h2", "h3", "h4", "p", "button", "img", "a"];
    return tags.map((t) => document.querySelectorAll(t).length).join(",");
  }) as Promise<string>;

type Box = { top: number; left: number; bottom: number; right: number };

/** A point inside `band` that is NOT inside `child` — the slot's padding. Walks
 *  the band's own corners (inset a few px) and returns the first that clears the
 *  child box. Undefined when the child fills the band (no padding to click). */
export const bandPaddingPoint = (
  band: Box,
  child: Box,
): { x: number; y: number } | undefined => {
  const inside = (p: { x: number; y: number }) =>
    p.x >= child.left &&
    p.x <= child.right &&
    p.y >= child.top &&
    p.y <= child.bottom;
  const candidates = [
    { x: band.left + 3, y: band.top + 3 },
    { x: band.right - 3, y: band.top + 3 },
    { x: band.left + 3, y: band.bottom - 3 },
    { x: band.right - 3, y: band.bottom - 3 },
  ];
  return candidates.find((p) => !inside(p));
};

/** The on-screen (viewport) box of a rendered page element by its CSS selector,
 *  read from the light DOM. Lets a slot-band test aim a click at a child vs the
 *  slot padding around it. */
export const getPageElementBox = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: b.top, left: b.left, bottom: b.bottom, right: b.right };
  }, selector) as Promise<{
    top: number;
    left: number;
    bottom: number;
    right: number;
  } | null>;

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

/** The slot-stop label's viewport box. Lets a test aim a REAL mouse click
 *  (with coordinates) at the label, exercising the document-level click handler
 *  the way a designer's pointer does — `.click()` cannot. When `active` is set,
 *  targets the ACTIVE label (the owning slot's), not a choosable sibling. */
export const getSlotStopLabelViewportRect = (page: Page, active = false) =>
  page.evaluate((act) => {
    const sel = act
      ? "[data-role='slot-stop-label'][data-active]"
      : "[data-role='slot-stop-label']";
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const el = d.shadowRoot.querySelector(sel) as HTMLElement | null;
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    }
    return null;
  }, active) as Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>;

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

/** The catalog picker's on-screen (viewport) bounding box, read from the rendered
 *  element. Lets a test assert the picker sits over the slot band it targets. */
export const getCatalogPickerRect = (page: Page) =>
  shadowQuery(page, (r) => {
    const el = r.querySelector("[data-role='catalog-picker']");
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: b.top, left: b.left, bottom: b.bottom, right: b.right };
  }) as Promise<{
    top: number;
    left: number;
    bottom: number;
    right: number;
  } | null>;

/** Hit-test the shadow root at the catalog picker's center: true when the topmost
 *  surface there is the picker (or its descendant), false when another overlay
 *  surface — e.g. a slot-stop band — paints above it. The picker must be the
 *  topmost surface while open, so a click at its center reaches it. */
export const pickerOwnsCenterPoint = (page: Page) =>
  shadowQuery(page, (r) => {
    const picker = r.querySelector("[data-role='catalog-picker']");
    if (!picker) return false;
    const b = picker.getBoundingClientRect();
    const x = (b.left + b.right) / 2;
    const y = (b.top + b.bottom) / 2;
    const hit = (
      r as unknown as ShadowRoot & {
        elementFromPoint(x: number, y: number): Element | null;
      }
    ).elementFromPoint(x, y);
    return hit !== null && picker.contains(hit);
  }) as Promise<boolean>;

/** Every painted slot-stop band's on-screen box plus its label and whether it is
 *  the active (chosen) band — the full set of slot hit-targets in the slot-choice
 *  step. */
export const readSlotBands = (page: Page) =>
  shadowQuery(page, (r) =>
    [...r.querySelectorAll("[data-role='slot-stop']")].map((band) => {
      const b = band.getBoundingClientRect();
      return {
        active: band.hasAttribute("data-active"),
        top: b.top,
        left: b.left,
        bottom: b.bottom,
        right: b.right,
      };
    }),
  ) as Promise<
    {
      active: boolean;
      top: number;
      left: number;
      bottom: number;
      right: number;
    }[]
  >;

/** Every slot-stop label currently on screen — the named slots offered/chosen in
 *  the slot-choice step. The law: an insert never writes without one of these
 *  visible. */
export const readSlotStopLabels = (page: Page) =>
  shadowQuery(page, (r) =>
    [...r.querySelectorAll("[data-role='slot-stop-label']")].map(
      (el) => el.textContent ?? "",
    ),
  ) as Promise<string[]>;

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

/** Count of overlay elements painting any retired resolved-destination label —
 *  the line zone label, the edge position chip, the root drop label. All folded
 *  into the move ghost; this must read zero during a move (R4: no resurrected
 *  datum element). */
export const countRetiredDestinationLabels = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r.querySelectorAll(
        "[data-role='drop-zone-label'], [data-role='drop-position-chip'], [data-role='root-drop-label']",
      ).length,
  ) as Promise<number>;

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

/**
 * Native-drag stepping with real per-step hit-testing. Unlike `dispatchDrag`
 * (one shared `DataTransfer` per call), these three step a single live drag:
 * `dragStart` opens it from the source center and stashes the `DataTransfer` on
 * `window.__dt`; `dragOverAt` fires dragenter/dragover at a point whose target
 * is resolved by `document.elementFromPoint` (so resolution reflects what the
 * pointer actually lands on, not a known element); `dragEnd` closes it. Use when
 * a test must read the overlay's resolution at each pointer position along a path.
 */
export const dragStart = async (page: Page, source: Locator) => {
  const from = await sourceCenter(source);
  await page.evaluate((f) => {
    const dt = new DataTransfer();
    (window as unknown as { __dt: DataTransfer }).__dt = dt;
    document.elementFromPoint(f.x, f.y)?.dispatchEvent(
      new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: f.x,
        clientY: f.y,
        dataTransfer: dt,
      }),
    );
  }, from);
};

export const dragOverAt = async (page: Page, p: Point) => {
  await page.evaluate((pt) => {
    const dt = (window as unknown as { __dt: DataTransfer }).__dt;
    const init: DragEventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: pt.x,
      clientY: pt.y,
      dataTransfer: dt,
    };
    const tgt = document.elementFromPoint(pt.x, pt.y);
    tgt?.dispatchEvent(new DragEvent("dragenter", init));
    tgt?.dispatchEvent(new DragEvent("dragover", init));
  }, p);
  await page.waitForTimeout(20);
};

export const dragEnd = (page: Page, p: Point) =>
  page.evaluate((pt) => {
    const dt = (window as unknown as { __dt: DataTransfer }).__dt;
    document.elementFromPoint(pt.x, pt.y)?.dispatchEvent(
      new DragEvent("dragend", {
        bubbles: true,
        composed: true,
        clientX: pt.x,
        clientY: pt.y,
        dataTransfer: dt,
      }),
    );
  }, p);

// --- Prop sheet helpers ---

/** True when the sheet panel is mounted in the overlay. */
export const isSheetVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='prop-sheet']") !== null,
  ) as Promise<boolean>;

/** The sheet panel's viewport bounding box. Lets a test assert the sheet is
 *  fully on-screen and not occluding the canvas element. Null when absent. */
export const getSheetRect = (page: Page) =>
  shadowQuery(page, (r) => {
    const el = r.querySelector(
      "[data-role='prop-sheet']",
    ) as HTMLElement | null;
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: b.top, left: b.left, width: b.width, height: b.height };
  }) as Promise<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>;

/** The backdrop cutout div's inline-style geometry (set by the rAF anchor loop),
 *  mirroring the selected element's position. Lets a test verify the cutout tracks
 *  the element through retarget and layout changes. Null when absent. */
export const getBackdropCutoutRect = (page: Page) =>
  shadowQuery(page, (r) => {
    const el = r.querySelector(
      "[data-role='prop-sheet-backdrop']",
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

// --- Segmented control helpers ---

/** The ARIA role of the segmented control root in the overlay shadow root —
 *  "radiogroup" when the Ark SegmentGroup is mounted. Null when absent. */
export const getSegmentedRole = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r.querySelector("[data-role='segmented']")?.getAttribute("role") ?? null,
  ) as Promise<string | null>;

/** Every segmented control item currently rendered inside the prop sheet, read
 *  from the overlay shadow root by data-role. Returns `{ value, checked, focused }`
 *  for each item. `checked` reads `data-state="checked"` (Ark SegmentGroup/zag
 *  radio-group convention). `focused` reads `shadowRoot.activeElement` (a roving
 *  segment may host focus on a descendant input, so containment counts). */
export const readSegmentedItems = (page: Page) =>
  shadowQuery(page, (r) => {
    const active = r.activeElement;
    return [...r.querySelectorAll("[data-role='segmented-item']")].map(
      (el) => ({
        value: el.getAttribute("data-value") ?? "",
        checked: el.getAttribute("data-state") === "checked",
        focused: el === active || el.contains(active),
      }),
    );
  }) as Promise<{ value: string; checked: boolean; focused: boolean }[] | null>;

/** Focus the first segmented-item inside the overlay shadow root.
 *  Returns true when the focus actually landed (activeElement is the item or a
 *  descendant — Ark may delegate focus to a hidden radio input). */
export const focusFirstSegmentedItem = (page: Page) =>
  shadowQuery(page, (r) => {
    const item = r.querySelector(
      "[data-role='segmented-item']",
    ) as HTMLElement | null;
    item?.focus();
    return r.activeElement === item || item?.contains(r.activeElement) === true;
  }) as Promise<boolean>;

/** The on-screen (viewport) center of the segmented item whose data-value matches,
 *  so a test can aim a REAL mouse click at it. Uses page.evaluate (not shadowQuery)
 *  because shadowQuery stringifies its callback and cannot carry the `value` arg —
 *  the same reason clickToolbarAction / clickMorphPickerItem are parameterized this
 *  way. Null when no such item exists. */
export const getSegmentedItemCenter = (page: Page, value: string) =>
  page.evaluate((wanted) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const items = [
        ...d.shadowRoot.querySelectorAll("[data-role='segmented-item']"),
      ] as HTMLElement[];
      const el = items.find((i) => i.getAttribute("data-value") === wanted);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    }
    return null;
  }, value) as Promise<{ x: number; y: number } | null>;

/** Expand every collapsed disclosure group in the open sheet so its nested
 *  fields render into the DOM. Returns how many triggers were clicked. */
export const expandSheetDisclosures = (page: Page) =>
  shadowQuery(page, (r) => {
    const triggers = [
      ...r.querySelectorAll(
        "[data-role='prop-sheet'] [data-role='disclosure-trigger']",
      ),
    ] as HTMLElement[];
    triggers
      .filter((t) => t.getAttribute("aria-expanded") !== "true")
      .forEach((t) => t.click());
    return triggers.length;
  }) as Promise<number>;
