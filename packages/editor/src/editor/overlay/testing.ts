import { expect, type Page, type Locator } from "@playwright/test";

export { FIX } from "../../test-catalog/fixture.js";

// --- Page boot ---

/** Open the frozen-catalog harness and wait until the editor is operable: the
 *  fixture has rendered into the light DOM AND the overlay's shadow root has
 *  adopted its token sheet — OverlayRoot's mount effect, the point past which
 *  overlay children can paint (see overlay/root.tsx). Both are signals the boot
 *  actually emits; a fixed sleep only guessed at when they would arrive. */
export const openTestPage = async (page: Page) => {
  await page.goto("/test.html");
  await page.waitForFunction(() => {
    const host = [...document.querySelectorAll("div")].find(
      (d) => d.shadowRoot && d.style.position === "fixed",
    );
    return (
      (host?.shadowRoot?.adoptedStyleSheets.length ?? 0) > 0 &&
      document.querySelector("[data-testid]") !== null
    );
  });
};

/** Let the editor's render loop catch up with an interaction that has already
 *  been dispatched. Clicks and keypresses are discrete-priority React events —
 *  their state commit is flushed before the dispatch returns — so the only thing
 *  still outstanding is the overlay's rAF-anchored paint. Two frames covers it.
 *
 *  Use this where the interaction has no distinct post-state to poll for (a
 *  no-op, or a retarget that leaves affordance counts unchanged). Where there
 *  IS one — a panel appearing, a value committing — poll for that instead. */
export const settle = (page: Page) => waitFrames(page, 2);

// --- Frozen-catalog selection ---

/** Click a rendered element and let the selection land. Unlike polling a ring
 *  COUNT, this stays honest when the click retargets an existing selection —
 *  the count never changes there, so a poll would pass before the move. */
export const selectElement = async (page: Page, target: Locator) => {
  await target.click();
  await settle(page);
};

/** Click the frozen-catalog element rendered with the given `data-testid` (its
 *  fixture id). The single deterministic way to select a specific element
 *  without relying on copy or DOM structure. */
export const selectByTestId = (page: Page, id: string) =>
  selectElement(page, page.locator(`[data-testid='${id}']`).first());

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

/** The action bar's (toolbar's) viewport bounding box. Null when absent. */
export const getToolbarRect = (page: Page) =>
  shadowQuery(page, (r) => {
    const el = r.querySelector("[role='toolbar']") as HTMLElement | null;
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: b.top, left: b.left, bottom: b.bottom, right: b.right };
  }) as Promise<{
    top: number;
    left: number;
    bottom: number;
    right: number;
  } | null>;

/** Count of VISIBLE edge move-arrows (H2 hides an arrow whose anchor edge is
 *  scrolled out by setting visibility:hidden, so hidden ones don't count). */
export const countVisibleEdgeArrows = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      [
        ...r.querySelectorAll(
          "[data-role='edge-arrow-prev'], [data-role='edge-arrow-next']",
        ),
      ].filter((el) => getComputedStyle(el).visibility !== "hidden").length,
  ) as Promise<number>;

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

/** Click a toolbar action with a REAL mouse (page.mouse at the button's viewport
 *  center), unlike clickToolbarAction's programmatic .click(). A trusted click is
 *  what reproduces the self-unmount race: opening the sheet detaches the button
 *  mid-dispatch, and only a native click flushes React's discrete update
 *  synchronously enough for a bubbled document handler to see the detached
 *  target. Returns false when the button isn't found. */
export const realClickToolbarAction = async (
  page: Page,
  action: string,
): Promise<boolean> => {
  const rect = (await page.evaluate((a) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const btn = d.shadowRoot.querySelector(
        `[role='toolbar'] [data-role='action-${a}']`,
      ) as HTMLElement | null;
      if (!btn) return null;
      const b = btn.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    }
    return null;
  }, action)) as { x: number; y: number } | null;
  if (!rect) return false;
  await page.mouse.click(rect.x, rect.y);
  return true;
};

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
      const btn = d.shadowRoot.querySelector(
        "[data-role='select-parent-btn']",
      ) as HTMLElement | null;
      btn?.click();
      return;
    }
  });

/** Climb to the parent node. Climb is pure node→node navigation: one ↑ click on
 *  the chip selects the parent element directly (it never enters slot-selected).
 *  Use when you need the FloatingActionBar (toolbar) visible on the parent. */
export const climbToParent = async (page: Page) => {
  await selectParentElement(page);
  await waitFrames(page, 2);
};

/** Enter the insert slot-choice step (slot-selected) on a multi-slot node: climb
 *  to the node, then open insert with `/`. The only path to slot-selected now
 *  that climb navigates nodes only — the slot bands belong to the insert flow. */
export const enterSlotChoice = async (page: Page) => {
  await selectParentElement(page);
  await waitFrames(page, 2);
  await page.keyboard.press("/");
  await expect.poll(() => isSlotStopVisible(page)).toBe(true);
};

export const isSlotStopVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='slot-stop']") !== null,
  ) as Promise<boolean>;

/** Count of overlay elements that name the SELECTED slot — the active slot-stop
 *  label. Sibling (choosable) slot-stop labels name other, candidate slots and
 *  are excluded. R12's one-painter observer: at most one element may name the
 *  selected slot per state (the active slot-stop in slot-selected, none in
 *  resting-selected — the chip slot-address line was retired with the selection
 *  cluster), never two. */
export const countSelectedSlotNamers = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r.querySelectorAll("[data-role='slot-stop-label'][data-active]").length,
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

/** True when the selection ring is in editing mode — the "sheet open" surface
 *  state (bolder ring + backdrop cutout). The ring carries data-editing only
 *  while a focus sheet is open on the selected element. */
export const isSelectionRingEditing = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r.querySelector("[data-role='selection-ring'][data-editing]") !== null,
  ) as Promise<boolean>;

/** True when the unified action bar (edit + move buttons) is mounted.
 *  Previously checked for [data-role='selection-label'] — that breadcrumb strip
 *  was removed in favour of a single floating action bar. */
export const isSelectionLabelVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='action-edit']") !== null,
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
      labelCluster: has("[data-role='action-edit']"),
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

/** True when the box-model toggle carries aria-pressed="true". Null when the
 *  toggle isn't rendered (no single selection). */
export const isBoxModelToggleActive = (page: Page) =>
  shadowQuery(page, (r) => {
    const btn = r.querySelector("[data-role='box-model-toggle']");
    return btn ? btn.getAttribute("aria-pressed") === "true" : null;
  }) as Promise<boolean | null>;

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

/** Click a VALID (top-level, allowed) catalog-picker item by its component type
 *  name. Returns false when no enabled item with that name is present — so an
 *  allowed type absent from the valid list is a failed precondition, not a
 *  silent no-op. */
export const clickCatalogPickerItem = (page: Page, type: string) =>
  page.evaluate((t) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
        continue;
      const item = [
        ...d.shadowRoot.querySelectorAll("[data-role='catalog-picker-item']"),
      ].find(
        (el) =>
          !(el as HTMLButtonElement).disabled &&
          el.querySelector("[data-role='catalog-picker-item-type']")
            ?.textContent === t,
      ) as HTMLButtonElement | undefined;
      if (!item) return false;
      item.click();
      return true;
    }
    return false;
  }, type) as Promise<boolean>;

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
    const btn = r.querySelector(
      "[data-role='action-morph']",
    ) as HTMLButtonElement | null;
    if (!btn) return null;
    const leading = /^\d+/.exec(btn.getAttribute("aria-label") ?? "");
    return {
      disabled: btn.disabled,
      count: leading ? parseInt(leading[0], 10) : 0,
    };
  }) as Promise<{ disabled: boolean; count: number } | null>;

export const clickMorphButton = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const btn = d.shadowRoot.querySelector("[data-role='action-morph']") as
        HTMLElement | undefined;
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

export const getMorphPickerEntries = (page: Page) =>
  shadowQuery(page, (r) => {
    const picker = r.querySelector("[data-role='morph-picker']");
    if (!picker) return null;
    return [...picker.querySelectorAll(".morph-picker-item")].map((el) => ({
      name: el.querySelector(".morph-picker-name")?.textContent ?? "",
      kind: el.getAttribute("data-kind") ?? "",
    }));
  }) as Promise<{ name: string; kind: string }[] | null>;

export const getMorphPickerRect = (page: Page) =>
  shadowQuery(page, (r) => {
    const picker = r.querySelector("[data-role='morph-picker']");
    if (!picker) return null;
    const b = picker.getBoundingClientRect();
    return { top: b.top, left: b.left, right: b.right, bottom: b.bottom };
  }) as Promise<{
    top: number;
    left: number;
    right: number;
    bottom: number;
  } | null>;

export const hasMorphVariantsLabel = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r.querySelector("[data-role='morph-picker-variants-label']") !== null,
  ) as Promise<boolean>;

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

/** A press point inside `source` that a REAL hit-test confirms lands on the
 *  source (or a descendant). Selection chrome — the edge arrows sit just inside
 *  a selected element's top edge — can cover a small element's center, so a
 *  blind center press would land on the overlay and never start a drag. Scans
 *  center-out candidate fractions of the source box and returns the first point
 *  `document.elementFromPoint` resolves into the source. Throws when every
 *  candidate is occluded (fail loud: the element is unreachable to a pointer). */
export const draggablePressPoint = async (source: Locator): Promise<Point> => {
  const point = await source.evaluate((el) => {
    const b = el.getBoundingClientRect();
    const fracs = [0.5, 0.3, 0.7, 0.15, 0.85];
    for (const fy of fracs)
      for (const fx of fracs) {
        const p = { x: b.left + b.width * fx, y: b.top + b.height * fy };
        const hit = document.elementFromPoint(p.x, p.y);
        if (hit && (hit === el || el.contains(hit))) return p;
      }
    return null;
  });
  if (!point)
    throw new Error("Source fully occluded — no press point reaches it");
  return point;
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
 * `dragStart` opens it from a hit-verified press point on the source (see
 * `draggablePressPoint`) and stashes the `DataTransfer` on
 * `window.__dt`; `dragOverAt` fires dragenter/dragover at a point whose target
 * is resolved by `document.elementFromPoint` (so resolution reflects what the
 * pointer actually lands on, not a known element); `dragEnd` closes it. Use when
 * a test must read the overlay's resolution at each pointer position along a path.
 */
export const dragStart = async (page: Page, source: Locator) => {
  const from = await draggablePressPoint(source);
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
  // dragover is a continuous-priority React event, so its commit can land after
  // the dispatch returns. Two frames covers the commit plus the overlay's rAF
  // anchor pass — the point where the resolution is readable.
  await waitFrames(page, 2);
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

/** The sheet header's label text — which element's sheet is open. Null when
 *  the sheet is absent. */
export const getSheetHeaderLabel = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r.querySelector("[data-role='prop-sheet-label']")?.textContent?.trim() ??
      null,
  ) as Promise<string | null>;

/** Count of a data-role inside the overlay. Zero when the overlay is absent. */
export const countRole = (page: Page, role: string) =>
  page.evaluate((wanted) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      return d.shadowRoot.querySelectorAll(`[data-role='${wanted}']`).length;
    }
    return 0;
  }, role) as Promise<number>;

/** Count of interactive controls in the open sheet — inputs, selects,
 *  textareas, radio groups, and disclosure triggers. Zero means the sheet
 *  rendered empty (or not at all). */
export const countSheetControls = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r.querySelectorAll(
        [
          "[data-role='prop-sheet'] input",
          "[data-role='prop-sheet'] textarea",
          "[data-role='prop-sheet'] select",
          "[data-role='prop-sheet'] [role='radiogroup']",
          "[data-role='prop-sheet'] [data-role='disclosure-trigger']",
        ].join(", "),
      ).length,
  ) as Promise<number>;

/** True while the editor's crash boundary is showing its recovery notice.
 *  The notice lives in the light DOM — a crash replaces the whole editor
 *  surface, overlay shadow root included. */
export const isCrashNoticeVisible = (page: Page) =>
  page.locator("[data-role='crash-recovery']").isVisible();

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

/** Locate a `[data-role='segmented']` root in the shadow root, optionally
 *  scoped by the field's visible label. Mirrors the `dimensionRoot` pattern so
 *  callers that need label-scoping can serialize this finder into `page.evaluate`.
 *  When `label` is omitted the first segmented root is returned (legacy behaviour). */
const segmentedRoot = (
  root: ShadowRoot,
  label?: string,
): Element | undefined => {
  const roots = [
    ...root.querySelectorAll("[data-role='segmented']"),
  ] as HTMLElement[];
  if (!label) return roots[0];
  return roots.find((r) => {
    const field = r.closest(".prop-field");
    return field?.querySelector("label")?.textContent?.trim() === label;
  });
};

/** The ARIA role of the segmented control root in the overlay shadow root —
 *  "radiogroup" when the Ark SegmentGroup is mounted. When `fieldLabel` is
 *  supplied the lookup is scoped to the field whose label matches (e.g. "level"),
 *  so tests remain correct even when multiple segmented controls are on screen. */
export const getSegmentedRole = (page: Page, fieldLabel?: string) =>
  page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        return root?.getAttribute("role") ?? null;
      }
      return null;
    },
    { label: fieldLabel, finder: segmentedRoot.toString() },
  ) as Promise<string | null>;

/** Every segmented control item currently rendered inside the prop sheet, read
 *  from the overlay shadow root by data-role. Returns `{ value, checked, focused }`
 *  for each item. `checked` reads `data-state="checked"` (Ark SegmentGroup/zag
 *  radio-group convention). `focused` reads `shadowRoot.activeElement` (a roving
 *  segment may host focus on a descendant input, so containment counts).
 *  When `fieldLabel` is supplied the lookup is scoped to the named field. */
export const readSegmentedItems = (page: Page, fieldLabel?: string) =>
  page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const active = d.shadowRoot.activeElement;
        return [...root.querySelectorAll("[data-role='segmented-item']")].map(
          (el) => ({
            value: el.getAttribute("data-value") ?? "",
            checked: el.getAttribute("data-state") === "checked",
            focused: el === active || el.contains(active),
          }),
        );
      }
      return null;
    },
    { label: fieldLabel, finder: segmentedRoot.toString() },
  ) as Promise<{ value: string; checked: boolean; focused: boolean }[] | null>;

/** Focus the first segmented-item inside the overlay shadow root, optionally
 *  scoped to the field identified by `fieldLabel`. Returns true when the focus
 *  actually landed (activeElement is the item or a descendant — Ark may delegate
 *  focus to a hidden radio input). */
export const focusFirstSegmentedItem = (page: Page, fieldLabel?: string) =>
  page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const item = root.querySelector(
          "[data-role='segmented-item']",
        ) as HTMLElement | null;
        item?.focus();
        const active = d.shadowRoot.activeElement;
        return active === item || item?.contains(active) === true;
      }
      return false;
    },
    { label: fieldLabel, finder: segmentedRoot.toString() },
  ) as Promise<boolean>;

/** The on-screen (viewport) center of the segmented item whose data-value matches,
 *  optionally scoped to the field identified by `fieldLabel`. Uses page.evaluate
 *  because shadowQuery stringifies its callback and cannot carry extra args —
 *  the same reason clickToolbarAction / clickMorphPickerItem are parameterized this
 *  way. Null when no such item exists. */
export const getSegmentedItemCenter = (
  page: Page,
  value: string,
  fieldLabel?: string,
) =>
  page.evaluate(
    ({ wanted, label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const items = [
          ...root.querySelectorAll("[data-role='segmented-item']"),
        ] as HTMLElement[];
        const el = items.find((i) => i.getAttribute("data-value") === wanted);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }
      return null;
    },
    { wanted: value, label: fieldLabel, finder: segmentedRoot.toString() },
  ) as Promise<{ x: number; y: number } | null>;

// --- Swatch control helpers ---

/** The ARIA role of the swatch grid root in the overlay shadow root —
 *  "radiogroup" when the Ark SegmentGroup is mounted. Null when absent. */
export const getSwatchRole = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r.querySelector("[data-role='swatch']")?.getAttribute("role") ?? null,
  ) as Promise<string | null>;

/** Every swatch item currently rendered inside the prop sheet, read from the
 *  overlay shadow root by data-role. Returns `{ value, checked }` for each item.
 *  `checked` reads `data-state="checked"` (Ark SegmentGroup/zag radio-group
 *  convention). `value` is the option's hex string. */
export const readSwatchItems = (page: Page) =>
  shadowQuery(page, (r) =>
    [...r.querySelectorAll("[data-role='swatch-item']")].map((el) => ({
      value: el.getAttribute("data-value") ?? "",
      checked: el.getAttribute("data-state") === "checked",
    })),
  ) as Promise<{ value: string; checked: boolean }[] | null>;

/** Each swatch's rendered color block read from the overlay shadow root: the
 *  hex `value` it represents, its on-screen `width`/`height`, and the computed
 *  `background` color. Proves the color actually PAINTS (non-zero box) and is not
 *  a collapsed wrapper — the regression a data-attribute-only read can't catch. */
export const readSwatchPaints = (page: Page) =>
  shadowQuery(page, (r) =>
    [...r.querySelectorAll("[data-role='swatch-item']")].map((item) => {
      const block = item.querySelector(".swatch-color") as HTMLElement | null;
      const box = block?.getBoundingClientRect();
      return {
        value: item.getAttribute("data-value") ?? "",
        width: box?.width ?? 0,
        height: box?.height ?? 0,
        background: block ? getComputedStyle(block).backgroundColor : "",
      };
    }),
  ) as Promise<
    | { value: string; width: number; height: number; background: string }[]
    | null
  >;

/** True when the swatch sentinel chip is present in the overlay shadow root.
 *  The sentinel is always rendered — use isSwatchSentinelSelected to check
 *  whether the unset state is currently active. */
export const isSwatchSentinelVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='swatch-sentinel']") !== null,
  ) as Promise<boolean>;

/** True when the swatch sentinel carries data-selected (i.e. no color is set). */
export const isSwatchSentinelSelected = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r
        .querySelector("[data-role='swatch-sentinel']")
        ?.hasAttribute("data-selected") ?? false,
  ) as Promise<boolean>;

/** The on-screen center of the swatch sentinel for a real mouse click. */
export const getSwatchSentinelCenter = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
        continue;
      const el = d.shadowRoot.querySelector(
        "[data-role='swatch-sentinel']",
      ) as HTMLElement | null;
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    }
    return null;
  }) as Promise<{ x: number; y: number } | null>;

/** The custom off-palette chip, when rendered — `{ background, title }` read
 *  from the live DOM (background via computed style, title = the stored literal
 *  verbatim). Null when the value is unset or a palette preset (the chip only
 *  exists while the stored value is an off-palette literal). */
export const readSwatchCustomChip = (page: Page) =>
  shadowQuery(page, (r) => {
    const el = r.querySelector(
      "[data-role='swatch-custom']",
    ) as HTMLElement | null;
    if (!el) return null;
    return {
      background: getComputedStyle(el).backgroundColor,
      title: el.getAttribute("title") ?? "",
    };
  }) as Promise<{ background: string; title: string } | null>;

/** The current text of the swatch free-form input (draft or stored literal).
 *  Null when the input is absent. */
export const getSwatchInputValue = (page: Page) =>
  shadowQuery(page, (r) => {
    const input = r.querySelector(
      "[data-role='swatch-input']",
    ) as HTMLInputElement | null;
    return input ? input.value : null;
  }) as Promise<string | null>;

/** True when the swatch free-form input carries data-invalid (an uncommitted,
 *  unparseable draft). */
export const isSwatchInputInvalid = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r
        .querySelector("[data-role='swatch-input']")
        ?.hasAttribute("data-invalid") ?? false,
  ) as Promise<boolean>;

/** Type a color literal into the swatch free-form input through the REAL
 *  keyboard: focus by clicking the input's viewport center, select-all, type,
 *  then Enter (the continuous commit path's flush) unless `flush: false` —
 *  which leaves the draft in-flight so tests can observe the pre-commit state.
 *  Returns false when the input cannot be located. */
export const setSwatchColorText = async (
  page: Page,
  text: string,
  { flush = true }: { flush?: boolean } = {},
): Promise<boolean> => {
  const rect = (await shadowQuery(page, (r) => {
    const input = r.querySelector(
      "[data-role='swatch-input']",
    ) as HTMLInputElement | null;
    if (!input) return null;
    input.scrollIntoView({ block: "nearest" });
    const b = input.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  })) as { x: number; y: number } | null;
  if (!rect) return false;
  await page.mouse.click(rect.x, rect.y);
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(text);
  if (flush) await page.keyboard.press("Enter");
  return true;
};

/** The on-screen (viewport) center of the swatch item whose data-value matches,
 *  so a test can aim a REAL mouse click at it. Uses page.evaluate (not shadowQuery)
 *  because shadowQuery stringifies its callback and cannot carry the `value` arg —
 *  the same reason getSegmentedItemCenter is parameterized this way. Null when no
 *  such item exists. */
export const getSwatchItemCenter = (page: Page, value: string) =>
  page.evaluate((wanted) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const items = [
        ...d.shadowRoot.querySelectorAll("[data-role='swatch-item']"),
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

// --- Dimension control helpers ---

/** Locate one dimension control's parts inside the overlay shadow root, scoping by
 *  the field's visible label. The control has no field-id attribute (matching its
 *  swatch/segmented siblings) — fields are distinguished by the `<label>` that
 *  precedes the `[data-role='dimension']` root inside the shared `.prop-field`
 *  wrapper. Runs inside `page.evaluate` so it can carry the label argument; reused
 *  by every dimension reader below so the finder lives in exactly one place.
 *  Returns the part requested by `sel` ("root" → the dimension root). */
const dimensionRoot = (
  root: ShadowRoot,
  label?: string,
): Element | undefined => {
  const roots = [
    ...root.querySelectorAll("[data-role='dimension']"),
  ] as HTMLElement[];
  if (!label) return roots[0];
  return roots.find((r) => {
    const field = r.closest(".prop-field");
    return field?.querySelector("label")?.textContent?.trim() === label;
  });
};

/** Every dimension chip for the given field label, read from the overlay shadow
 *  root by data-role. Returns `{ value, checked }` per chip. `checked` reads
 *  `data-state="checked"` (Ark SegmentGroup convention). */
export const readDimensionChips = (page: Page, fieldLabel?: string) =>
  page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        return [...root.querySelectorAll("[data-role='dimension-chip']")].map(
          (el) => ({
            value: el.getAttribute("data-value") ?? "",
            checked: el.getAttribute("data-state") === "checked",
          }),
        );
      }
      return null;
    },
    { label: fieldLabel, finder: dimensionRoot.toString() },
  ) as Promise<{ value: string; checked: boolean }[] | null>;

/** The current value of the dimension NumberInput field for the given label.
 *  Reads the `<input>` element's value. Null when absent. */
export const getDimensionInputValue = (page: Page, fieldLabel?: string) =>
  page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const input = root.querySelector(
          "[data-role='dimension-input'] input",
        ) as HTMLInputElement | null;
        return input ? input.value : null;
      }
      return null;
    },
    { label: fieldLabel, finder: dimensionRoot.toString() },
  ) as Promise<string | null>;

/** The custom marker for a dimension field, when rendered — `{ title, activeSource }`.
 *  `title` is the stored literal verbatim; `activeSource` is true when the number
 *  field carries data-source="custom" (the active-source tint). Null when the value
 *  is unset or a preset (the marker only exists for an off-grid/compound literal). */
export const readDimensionCustom = (page: Page, fieldLabel?: string) =>
  page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const el = root.querySelector("[data-role='dimension-custom']");
        if (!el) return null;
        // data-source rides the NumberInput.Control, a descendant of the
        // data-role="dimension-input" root.
        const activeSource = !!root.querySelector(
          "[data-role='dimension-input'] [data-source='custom']",
        );
        return { title: el.getAttribute("title") ?? "", activeSource };
      }
      return null;
    },
    { label: fieldLabel, finder: dimensionRoot.toString() },
  ) as Promise<{ title: string; activeSource: boolean } | null>;

/** The on-screen (viewport) center of the dimension chip whose data-value
 *  matches within the field identified by fieldLabel (or first field if omitted).
 *  The chip row is a no-wrap horizontal scroller (see dimension.css) — chips
 *  past the panel width are clipped, so the chip is scrolled into view first
 *  (instant scroll; layout settles synchronously) before its center is read.
 *  Null when no such chip exists. */
export const getDimensionChipCenter = (
  page: Page,
  value: string,
  fieldLabel?: string,
) =>
  page.evaluate(
    ({ wanted, label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const chips = [
          ...root.querySelectorAll("[data-role='dimension-chip']"),
        ] as HTMLElement[];
        const el = chips.find((c) => c.getAttribute("data-value") === wanted);
        if (!el) return null;
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
        const b = el.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }
      return null;
    },
    { wanted: value, label: fieldLabel, finder: dimensionRoot.toString() },
  ) as Promise<{ x: number; y: number } | null>;

/** The on-screen (viewport) bounding box of the dimension NumberInput's
 *  `<input>` element for the given field label. Building block for
 *  setDimensionValue — it aims the real click that focuses the input. */
const getDimensionInputRect = (page: Page, fieldLabel?: string) =>
  page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const input = root.querySelector(
          "[data-role='dimension-input'] input",
        ) as HTMLInputElement | null;
        if (!input) return null;
        const b = input.getBoundingClientRect();
        return { x: b.left, y: b.top, width: b.width, height: b.height };
      }
      return null;
    },
    { label: fieldLabel, finder: dimensionRoot.toString() },
  ) as Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>;

/** Type a value into the dimension NumberInput for the given field through the
 *  REAL keyboard: focus the input by clicking its viewport center, select-all,
 *  then type the digits. Exercises the actual commit path (zag NumberInput's
 *  input event → onValueChange → onChange) the way a designer's keystrokes do.
 *  Returns false when the input cannot be located. */
export const setDimensionValue = async (
  page: Page,
  value: string,
  fieldLabel?: string,
): Promise<boolean> => {
  const rect = await getDimensionInputRect(page, fieldLabel);
  if (!rect) return false;
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(value);
  await page.keyboard.press("Tab");
  return true;
};

/** True when the dimension sentinel is present in the field's DOM subtree.
 *  The sentinel is always rendered — use isDimensionSentinelSelected to check
 *  whether the unset state is currently active. */
export const isDimensionSentinelVisible = (page: Page, fieldLabel?: string) =>
  page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        return root.querySelector("[data-role='dimension-sentinel']") !== null;
      }
      return false;
    },
    { label: fieldLabel, finder: dimensionRoot.toString() },
  ) as Promise<boolean>;

/** True when the dimension sentinel carries data-selected (i.e. value is unset). */
export const isDimensionSentinelSelected = (page: Page, fieldLabel?: string) =>
  page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const sentinel = root.querySelector("[data-role='dimension-sentinel']");
        return sentinel?.hasAttribute("data-selected") ?? false;
      }
      return false;
    },
    { label: fieldLabel, finder: dimensionRoot.toString() },
  ) as Promise<boolean>;

/** The on-screen center of the dimension sentinel for a real mouse click.
 *  Scrolled into view first — the sentinel shares the clipped no-wrap chip
 *  row, so a previously scrolled row could hide it. */
export const getDimensionSentinelCenter = (page: Page, fieldLabel?: string) =>
  page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const el = root.querySelector(
          "[data-role='dimension-sentinel']",
        ) as HTMLElement | null;
        if (!el) return null;
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
        const b = el.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }
      return null;
    },
    { label: fieldLabel, finder: dimensionRoot.toString() },
  ) as Promise<{ x: number; y: number } | null>;

// --- Slot constraint helpers ---

/** True when the catalog picker has an "incompatible" collapsed section. */
export const hasCatalogPickerIncompatibleSection = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r.querySelector("[data-role='catalog-picker-incompatible']") !== null,
  ) as Promise<boolean>;

/** Type names of items inside the incompatible section of the catalog picker. */
export const getIncompatiblePickerItemTypes = (page: Page) =>
  shadowQuery(page, (r) => {
    const section = r.querySelector(
      "[data-role='catalog-picker-incompatible']",
    );
    if (!section) return [];
    return [
      ...section.querySelectorAll("[data-role='catalog-picker-item-type']"),
    ].map((el) => el.textContent ?? "");
  }) as Promise<string[]>;

/** Type names of items visible outside the incompatible section (valid items). */
export const getValidPickerItemTypes = (page: Page) =>
  shadowQuery(page, (r) => {
    const picker = r.querySelector("[data-role='catalog-picker']");
    if (!picker) return [];
    const all = [
      ...picker.querySelectorAll("[data-role='catalog-picker-item-type']"),
    ];
    const incompatible = r.querySelector(
      "[data-role='catalog-picker-incompatible']",
    );
    return all
      .filter((el) => !incompatible?.contains(el))
      .map((el) => el.textContent ?? "");
  }) as Promise<string[]>;

/** Expand the picker's collapsed "Incompatible" section by clicking its summary. */
export const openIncompatiblePickerSection = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const summary = d.shadowRoot.querySelector(
        "[data-role='catalog-picker-incompatible'] summary",
      ) as HTMLElement | null;
      summary?.click();
      return;
    }
  });

/** Focus the "Incompatible" summary via `.focus()` — no click, so it never
 *  triggers the native toggle itself. Isolates a subsequent real keypress
 *  (`page.keyboard.press`) as the sole cause of any resulting toggle. */
export const focusIncompatiblePickerSummary = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const summary = d.shadowRoot.querySelector(
        "[data-role='catalog-picker-incompatible'] summary",
      ) as HTMLElement | null;
      summary?.focus();
      return;
    }
  });

/** True when the picker's "Incompatible" `<details>` is expanded (open). */
export const isIncompatiblePickerSectionOpen = (page: Page) =>
  shadowQuery(page, (r) => {
    const section = r.querySelector(
      "[data-role='catalog-picker-incompatible']",
    ) as HTMLDetailsElement | null;
    return section?.open ?? false;
  }) as Promise<boolean>;

/** The inert-affordance state of an incompatible picker item by type name:
 *  `disabled` (cannot be activated) and `title` (the visible reason). Null when
 *  no such item is rendered. */
export const getIncompatiblePickerItemState = (page: Page, type: string) =>
  page.evaluate((t) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const section = d.shadowRoot.querySelector(
        "[data-role='catalog-picker-incompatible']",
      );
      if (!section) return null;
      const item = [
        ...section.querySelectorAll("[data-role='catalog-picker-item']"),
      ].find(
        (el) =>
          el.querySelector("[data-role='catalog-picker-item-type']")
            ?.textContent === t,
      ) as HTMLButtonElement | undefined;
      return item ? { disabled: item.disabled, title: item.title } : null;
    }
    return null;
  }, type) as Promise<{ disabled: boolean; title: string } | null>;

/** Dispatch a click on an incompatible picker item by type name — the attack a
 *  user could mount against the inert affordance. A disabled button must
 *  swallow it. */
export const clickIncompatiblePickerItem = (page: Page, type: string) =>
  page.evaluate((t) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const item = [
        ...d.shadowRoot.querySelectorAll(
          "[data-role='catalog-picker-incompatible'] [data-role='catalog-picker-item']",
        ),
      ].find(
        (el) =>
          el.querySelector("[data-role='catalog-picker-item-type']")
            ?.textContent === t,
      ) as HTMLElement | undefined;
      item?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, composed: true }),
      );
      return;
    }
  }, type);

/** True when the picker's rejection notice (role=alert) is rendered. */
export const isCatalogPickerNoticeVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='catalog-picker-notice']") !== null,
  ) as Promise<boolean>;

/** True when the picker's filter input holds DOM focus inside the shadow root —
 *  the "filter always focused" law: typing must land there, never leak past it. */
export const isCatalogPickerFilterFocused = (page: Page) =>
  shadowQuery(page, (r) => {
    const active = r.activeElement;
    return active !== null && active.matches(".catalog-picker-filter");
  }) as Promise<boolean>;

/** Type name of the keyboard-highlighted picker item (`data-active`), or null
 *  when nothing is highlighted. */
export const getActiveCatalogPickerItemType = (page: Page) =>
  shadowQuery(page, (r) => {
    const active = r.querySelector(
      "[data-role='catalog-picker-item'][data-active]",
    );
    return (
      active?.querySelector("[data-role='catalog-picker-item-type']")
        ?.textContent ?? null
    );
  }) as Promise<string | null>;

/** True when a blocked drop indicator (line or container) is currently rendered. */
export const hasBlockedDropIndicator = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r.querySelector("[data-role='drop-indicator'][data-blocked='true']") !==
        null ||
      r.querySelector(
        "[data-role='drop-indicator-container'][data-blocked='true']",
      ) !== null,
  ) as Promise<boolean>;

/** Dispatch a full drag-and-drop with shiftKey held at release. */
export const dispatchDragWithShift = (
  page: Page,
  args: { from: Point; to: Point },
) =>
  page.evaluate(({ from, to }) => {
    const dt = new DataTransfer();
    const opts = (
      p: { x: number; y: number },
      shift = false,
    ): DragEventInit => ({
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: p.x,
      clientY: p.y,
      shiftKey: shift,
      dataTransfer: dt,
    });
    const src = document.elementFromPoint(from.x, from.y)!;
    const tgt = document.elementFromPoint(to.x, to.y)!;
    src.dispatchEvent(new DragEvent("dragstart", opts(from)));
    tgt.dispatchEvent(new DragEvent("dragenter", opts(to)));
    tgt.dispatchEvent(new DragEvent("dragover", opts(to)));
    tgt.dispatchEvent(new DragEvent("drop", opts(to, true)));
    src.dispatchEvent(new DragEvent("dragend", opts(to, true)));
  }, args);

/** Dispatch a full drag-and-drop with altKey held at release — forces a drop
 *  through a slot-constraint-blocked target (consistent with carry's alt-force). */
export const dispatchDragWithAlt = (
  page: Page,
  args: { from: Point; to: Point },
) =>
  page.evaluate(({ from, to }) => {
    const dt = new DataTransfer();
    const base = (p: { x: number; y: number }): DragEventInit => ({
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: p.x,
      clientY: p.y,
      dataTransfer: dt,
    });
    const src = document.elementFromPoint(from.x, from.y)!;
    const tgt = document.elementFromPoint(to.x, to.y)!;
    src.dispatchEvent(new DragEvent("dragstart", base(from)));
    tgt.dispatchEvent(new DragEvent("dragenter", base(to)));
    tgt.dispatchEvent(new DragEvent("dragover", base(to)));
    tgt.dispatchEvent(new DragEvent("drop", { ...base(to), altKey: true }));
    src.dispatchEvent(new DragEvent("dragend", { ...base(to), altKey: true }));
  }, args);

/** Dispatch a full drag-and-drop with altKey held through the WHOLE gesture —
 *  dragover AND drop both carry altKey:true. This matches a real user holding
 *  Alt for the entire drag, unlike dispatchDragWithAlt (Alt only at release).
 *
 *  `leaveBeforeDrop` inserts a `dragleave` between the final `dragover` and the
 *  `drop`. pragmatic-dnd resets its tracked drop targets to `[]` on `dragleave`
 *  (lifecycle-manager), reproducing a real OS drag whose last native event before
 *  release retargets off every registered drop target — so `onDrop` fires with an
 *  empty `location.current.dropTargets` while the held indicator still shows. */
export const dispatchDragAltHeld = (
  page: Page,
  args: { from: Point; to: Point; leaveBeforeDrop?: boolean },
) =>
  page.evaluate(({ from, to, leaveBeforeDrop }) => {
    const dt = new DataTransfer();
    const alt = (p: { x: number; y: number }): DragEventInit => ({
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: p.x,
      clientY: p.y,
      altKey: true,
      dataTransfer: dt,
    });
    const src = document.elementFromPoint(from.x, from.y)!;
    const tgt = document.elementFromPoint(to.x, to.y)!;
    src.dispatchEvent(new DragEvent("dragstart", alt(from)));
    tgt.dispatchEvent(new DragEvent("dragenter", alt(to)));
    tgt.dispatchEvent(new DragEvent("dragover", alt(to)));
    if (leaveBeforeDrop) tgt.dispatchEvent(new DragEvent("dragleave", alt(to)));
    tgt.dispatchEvent(new DragEvent("drop", alt(to)));
    src.dispatchEvent(new DragEvent("dragend", alt(to)));
  }, args);

/** Case-B: Alt held the WHOLE gesture, hover a slot (`over`), then genuinely
 *  move out to a non-target point (`to`) and release there. Unlike
 *  `dispatchDragAltHeld({ leaveBeforeDrop })` — whose clearing `dragleave` fires
 *  at the SAME point still inside the zone (transient window-leave) — here the
 *  pointer truly leaves the slot: the `dragleave` carries `relatedTarget` set to
 *  the void element, and the final `dragover`/`drop` land on that void element.
 *  pragmatic clears its drop targets, but the drop point is no longer inside the
 *  last-hovered slot, so the held indicator must NOT commit. */
export const dispatchDragAltViaVoid = (
  page: Page,
  args: { from: Point; over: Point; to: Point },
) =>
  page.evaluate(({ from, over, to }) => {
    const dt = new DataTransfer();
    const alt = (
      p: { x: number; y: number },
      relatedTarget?: EventTarget | null,
    ): DragEventInit => ({
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: p.x,
      clientY: p.y,
      altKey: true,
      relatedTarget,
      dataTransfer: dt,
    });
    const src = document.elementFromPoint(from.x, from.y)!;
    const slot = document.elementFromPoint(over.x, over.y)!;
    const voidEl = document.elementFromPoint(to.x, to.y)!;
    src.dispatchEvent(new DragEvent("dragstart", alt(from)));
    slot.dispatchEvent(new DragEvent("dragenter", alt(over)));
    slot.dispatchEvent(new DragEvent("dragover", alt(over)));
    slot.dispatchEvent(new DragEvent("dragleave", alt(over, voidEl)));
    voidEl.dispatchEvent(new DragEvent("dragenter", alt(to)));
    voidEl.dispatchEvent(new DragEvent("dragover", alt(to)));
    voidEl.dispatchEvent(new DragEvent("drop", alt(to)));
    src.dispatchEvent(new DragEvent("dragend", alt(to)));
  }, args);

// --- Context menu helpers ---

/** True when the context menu (role=menu) is mounted in the overlay. */
export const isContextMenuVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='context-menu']") !== null,
  ) as Promise<boolean>;

/** The section label naming the ancestry group as navigation, or null when
 *  absent. Distinguishes the nav rows from the action rows below the divider. */
export const getContextMenuNavLabel = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r.querySelector("[data-role='context-menu-nav-label']")?.textContent ??
      null,
  ) as Promise<string | null>;

/** The ancestry entries (component-type menuitems above the divider), in
 *  paint order — the deepest hit element first. */
export const getContextMenuAncestryTypes = (page: Page) =>
  shadowQuery(page, (r) =>
    [
      ...r.querySelectorAll(
        "[data-role='context-menu'] .context-menu-item-type",
      ),
    ].map((el) => el.textContent ?? ""),
  ) as Promise<string[]>;

/** Every clipboard action's visible label and whether it carries
 *  aria-disabled (needsSelection with no current selection). */
export const getContextMenuActions = (page: Page) =>
  shadowQuery(page, (r) =>
    [
      ...r.querySelectorAll("[data-role='context-menu'] .context-menu-action"),
    ].map((el) => ({
      label: el.querySelector("span")?.textContent ?? "",
      disabled: el.getAttribute("aria-disabled") === "true",
    })),
  ) as Promise<{ label: string; disabled: boolean }[]>;

/** Click an ancestry item in the context menu by its component-type text
 *  (first match, matching paint order). */
export const clickContextMenuAncestryItem = (page: Page, type: string) =>
  page.evaluate((t) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const items = [
        ...d.shadowRoot.querySelectorAll(
          "[data-role='context-menu'] .context-menu-item",
        ),
      ];
      const item = items.find(
        (el) => el.querySelector(".context-menu-item-type")?.textContent === t,
      ) as HTMLElement | undefined;
      item?.click();
      return;
    }
  }, type);

/** Click a clipboard action item in the context menu by its visible label
 *  ("Copy" / "Cut" / "Paste" / "Duplicate"). */
export const clickContextMenuAction = (page: Page, label: string) =>
  page.evaluate((l) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const items = [
        ...d.shadowRoot.querySelectorAll(
          "[data-role='context-menu'] .context-menu-action",
        ),
      ];
      const item = items.find(
        (el) => el.querySelector("span")?.textContent === l,
      ) as HTMLElement | undefined;
      item?.click();
      return;
    }
  }, label);

/** The data-role='context-menu' item index currently carrying data-active
 *  (arrow-key highlight), or null when none is active. */
export const getContextMenuActiveIndex = (page: Page) =>
  shadowQuery(page, (r) => {
    const items = [
      ...r.querySelectorAll("[data-role='context-menu'] .context-menu-item"),
    ];
    const i = items.findIndex((el) => el.hasAttribute("data-active"));
    return i === -1 ? null : i;
  }) as Promise<number | null>;

// --- History timeline helpers ---

/** Every timeline dot's position class ("past" | "current" | "future") in
 *  rail order, plus whether it carries a custom name (data-named). */
export const readTimelineDots = (page: Page) =>
  shadowQuery(page, (r) =>
    [...r.querySelectorAll("[data-role='timeline-rail'] .timeline-dot")].map(
      (el) => ({
        position: el.hasAttribute("data-past")
          ? "past"
          : el.hasAttribute("data-current")
            ? "current"
            : "future",
        named: el.hasAttribute("data-named"),
      }),
    ),
  ) as Promise<{ position: "past" | "current" | "future"; named: boolean }[]>;

/** The timeline rail's current visibility state ("hidden" | "visible" |
 *  "interactive" | "stale" | "fading"). Null when the rail isn't mounted. */
export const getTimelineVisibility = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      r
        .querySelector("[data-role='timeline-rail']")
        ?.getAttribute("data-visibility") ?? null,
  ) as Promise<string | null>;

/** Click the Nth timeline dot (0-indexed, rail order) to restore that entry. */
export const clickTimelineDot = (page: Page, index: number) =>
  page.evaluate((i) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const dots = [
        ...d.shadowRoot.querySelectorAll(
          "[data-role='timeline-rail'] .timeline-dot",
        ),
      ] as HTMLElement[];
      dots[i]?.click();
      return;
    }
  }, index);

/** Hover the timeline rail (keeps it in the "interactive" visibility state,
 *  preventing auto-hide while a test drives multiple dot interactions). */
export const hoverTimelineRail = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const rail = d.shadowRoot.querySelector(
        "[data-role='timeline-rail']",
      ) as HTMLElement | null;
      rail?.dispatchEvent(
        new MouseEvent("mouseover", { bubbles: true, composed: true }),
      );
      return;
    }
  });

/** Hover the Nth timeline dot to surface its tooltip (the entry's name or commit
 *  label). Dispatches mouseover, the shadow-DOM-safe hover signal. */
export const hoverTimelineDot = (page: Page, index: number) =>
  page.evaluate((i) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const dots = [
        ...d.shadowRoot.querySelectorAll(
          "[data-role='timeline-rail'] .timeline-dot",
        ),
      ] as HTMLElement[];
      dots[i]?.dispatchEvent(
        new MouseEvent("mouseover", { bubbles: true, composed: true }),
      );
      return;
    }
  }, index);

/** Move the pointer off the timeline rail entirely (dispatches mouseout with
 *  no relatedTarget, the shadow-DOM-safe leave signal — see
 *  feedback_shadow_dom_mouse_events). */
export const unhoverTimelineRail = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const rail = d.shadowRoot.querySelector(
        "[data-role='timeline-rail']",
      ) as HTMLElement | null;
      rail?.dispatchEvent(
        new MouseEvent("mouseout", { bubbles: true, composed: true }),
      );
      return;
    }
  });

/** The on-screen (viewport) center of the Nth timeline dot (0-indexed, rail
 *  order) — lets a test aim a REAL mouse right-click at it (renaming is wired
 *  to the native contextmenu event on the dot button). Null when out of range. */
export const getTimelineDotCenter = (page: Page, index: number) =>
  page.evaluate((i) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const dots = [
        ...d.shadowRoot.querySelectorAll(
          "[data-role='timeline-rail'] .timeline-dot",
        ),
      ] as HTMLElement[];
      const el = dots[i];
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    }
    return null;
  }, index) as Promise<{ x: number; y: number } | null>;

/** The timeline rename `<input>`'s current value, or null when not rendered. */
export const getTimelineRenameInputValue = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      (
        r.querySelector(
          "[data-role='timeline-rail'] .timeline-rename-input",
        ) as HTMLInputElement | null
      )?.value ?? null,
  ) as Promise<string | null>;

/** Type into the open timeline rename input and confirm with Enter. Requires
 *  the input to already be mounted (opened via a right-click on a dot). */
export const submitTimelineRename = async (page: Page, name: string) => {
  await page.keyboard.type(name);
  await page.keyboard.press("Enter");
};

/** The rail tooltip's visible text when hovering a dot (name if renamed,
 *  otherwise the commit label). Null when the tooltip isn't showing. */
export const getTimelineTooltipText = (page: Page) =>
  shadowQuery(page, (r) => {
    const tooltip = r.querySelector(
      "[data-role='timeline-rail'] .timeline-tooltip",
    );
    if (!tooltip || !tooltip.hasAttribute("data-visible")) return null;
    return tooltip.textContent?.trim() ?? null;
  }) as Promise<string | null>;

// --- Array control helpers ---

type ArrayRowButton = { disabled: boolean; reason: string };

/** Click the sheet disclosure trigger whose visible label matches — expands
 *  (or collapses) exactly one named group, unlike expandSheetDisclosures which
 *  opens everything. Returns true when a matching trigger was clicked. */
export const toggleSheetDisclosure = (page: Page, label: string) =>
  page.evaluate((wanted) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const triggers = [
        ...d.shadowRoot.querySelectorAll(
          "[data-role='prop-sheet'] [data-role='disclosure-trigger']",
        ),
      ] as HTMLElement[];
      const trigger = triggers.find(
        (t) =>
          t.querySelector(".disclosure-label")?.textContent?.trim() === wanted,
      );
      if (!trigger) return false;
      trigger.click();
      return true;
    }
    return false;
  }, label) as Promise<boolean>;

/** Every array item row in the open sheet. For a multi-field row `summary` is
 *  the title and `secondary` the trailing detail; for a single-field inline row
 *  `summary` is the field's input value. `open` reflects whether a disclosure
 *  row's fields are showing. Plus each affordance's disabled state and reason —
 *  the honesty surface the control exposes per row. Null when no sheet is open. */
export const readArrayRows = (page: Page) =>
  shadowQuery(page, (r) =>
    [...r.querySelectorAll("[data-role='array-item-row']")].map((row) => {
      const button = (sel: string) => {
        const el = row.querySelector(sel) as HTMLButtonElement | null;
        return { disabled: el?.disabled ?? true, reason: el?.title ?? "" };
      };
      const title = row.querySelector(".array-row-title")?.textContent?.trim();
      const input = row.querySelector(
        ".array-row-field input, .array-row-field textarea",
      ) as HTMLInputElement | null;
      return {
        summary: title ?? input?.value ?? "",
        secondary:
          row.querySelector(".array-row-secondary")?.textContent?.trim() ?? "",
        open: row.hasAttribute("data-open"),
        up: button("[data-role='array-item-up']"),
        down: button("[data-role='array-item-down']"),
        remove: button("[data-role='array-item-remove']"),
      };
    }),
  ) as Promise<
    | {
        summary: string;
        secondary: string;
        open: boolean;
        up: ArrayRowButton;
        down: ArrayRowButton;
        remove: ArrayRowButton;
      }[]
    | null
  >;

/** The input values inside the Nth row's expanded field block, in field order.
 *  Empty when the row has no open fields. Lets a test prove which item an
 *  expansion is attached to after a reorder. Null when no sheet is open. */
export const readArrayRowFields = (page: Page, index: number) =>
  page.evaluate((i) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const row = d.shadowRoot.querySelectorAll("[data-role='array-item-row']")[
        i
      ];
      if (!row) return null;
      return [
        ...row.querySelectorAll(
          ".array-row-fields input, .array-row-fields textarea",
        ),
      ].map((el) => (el as HTMLInputElement).value);
    }
    return null;
  }, index) as Promise<string[] | null>;

/** Remove the Nth row via a REAL (trusted) mouse click on its × — the path that
 *  reproduces the self-unmount race a synthetic .click() masks. Moves the mouse
 *  over the button first so the hover-revealed action is clickable. Returns
 *  false when the row/button is absent or disabled. */
export const realRemoveArrayRow = async (page: Page, index: number) => {
  const box = await page.evaluate((i) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      const row = d.shadowRoot.querySelectorAll("[data-role='array-item-row']")[
        i
      ];
      if (!row) return null;
      const btn = row.querySelector(
        "[data-role='array-item-remove']",
      ) as HTMLButtonElement | null;
      if (!btn || btn.disabled) return null;
      const b = btn.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    }
    return null;
  }, index);
  if (!box) return false;
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.mouse.up();
  return true;
};

/** Whether the prop sheet is currently open. */
export const isPropSheetOpen = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      return !!d.shadowRoot.querySelector(
        "[data-role='prop-sheet'][data-open]",
      );
    }
    return false;
  }) as Promise<boolean>;

/** The array add button's state: disabled flag and its title reason. Null when
 *  no add button is rendered (array disclosure collapsed or no array field). */
export const readArrayAdd = (page: Page) =>
  shadowQuery(page, (r) => {
    const btn = r.querySelector(
      "[data-role='array-add']",
    ) as HTMLButtonElement | null;
    if (!btn) return null;
    return { disabled: btn.disabled, reason: btn.title };
  }) as Promise<ArrayRowButton | null>;

/** Click the array add button. Returns false when absent or disabled — the
 *  caller must treat that as a failed precondition, not a silent no-op. */
export const clickArrayAdd = (page: Page) =>
  shadowQuery(page, (r) => {
    const btn = r.querySelector(
      "[data-role='array-add']",
    ) as HTMLButtonElement | null;
    if (!btn || btn.disabled) return false;
    btn.click();
    return true;
  }) as Promise<boolean>;

/** Click one affordance on the Nth array item row (0-indexed): "up" / "down" /
 *  "remove" move or delete, "toggle" expands the item's fields. Returns false
 *  when the row or button is missing or disabled. */
export const clickArrayRowAction = (
  page: Page,
  index: number,
  action: "up" | "down" | "remove" | "toggle",
) =>
  page.evaluate(
    ({ i, a }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || d.style.position !== "fixed") continue;
        const row = d.shadowRoot.querySelectorAll(
          "[data-role='array-item-row']",
        )[i];
        if (!row) return false;
        const sel =
          a === "toggle"
            ? "[data-role='array-item-toggle']"
            : `[data-role='array-item-${a}']`;
        const btn = row.querySelector(sel) as HTMLButtonElement | null;
        if (!btn || btn.disabled) return false;
        btn.click();
        return true;
      }
      return false;
    },
    { i: index, a: action },
  ) as Promise<boolean>;

// --- Array-item slot child-list (canvas navigation) helpers ---

/** The `field-label` text of the mounted array-item slot summary. Null when no
 *  summary is mounted. Lets a test assert the honest field label ("Content"). */
export const readArraySlotLabel = (page: Page) =>
  shadowQuery(page, (r) => {
    const row = r.querySelector(".array-slot-summary");
    if (!row) return null;
    return row.querySelector(".field-label")?.textContent?.trim() ?? "";
  }) as Promise<string | null>;

/** The array-item slot's read-only child list: each child's displayed type
 *  label, in order. Null when no child list is mounted (an empty slot renders
 *  the insert affordance instead). Honest: it must mirror the item's ACTUAL
 *  stored children, so a test compares it against the fixture data. */
export const readArraySlotChildren = (page: Page) =>
  shadowQuery(page, (r) => {
    const list = r.querySelector("[data-role='array-slot-children']");
    if (!list) return null;
    return [...list.querySelectorAll("[data-role='array-slot-child']")].map(
      (b) =>
        b
          .querySelector(".array-slot-summary-child-type")
          ?.textContent?.trim() ?? "",
    );
  }) as Promise<string[] | null>;

/** Click the array-item slot child row with the given child id — the canvas
 *  navigation that closes the sheet and rings that child. Returns false when no
 *  such row is mounted. */
export const clickArraySlotChild = (page: Page, childId: string) =>
  page.evaluate((id) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
        continue;
      const btn = d.shadowRoot.querySelector(
        `[data-role='array-slot-child'][data-child-id='${id}']`,
      ) as HTMLButtonElement | null;
      if (!btn) return false;
      btn.click();
      return true;
    }
    return false;
  }, childId) as Promise<boolean>;

/** Click the array-item slot child row with a REAL mouse (page.mouse at the
 *  row's viewport center), unlike clickArraySlotChild's programmatic .click().
 *  A trusted click is what reproduces the self-unmount race: closing the sheet
 *  detaches the row mid-dispatch, and only a native click flushes React's
 *  discrete update synchronously enough for the bubbled document selection
 *  handler to see the detached target and re-select the canvas beneath it.
 *  Returns false when no such row is mounted. */
export const realClickArraySlotChild = async (
  page: Page,
  childId: string,
): Promise<boolean> => {
  const rect = (await page.evaluate((id) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
        continue;
      const btn = d.shadowRoot.querySelector(
        `[data-role='array-slot-child'][data-child-id='${id}']`,
      ) as HTMLElement | null;
      if (!btn) return null;
      const b = btn.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    }
    return null;
  }, childId)) as { x: number; y: number } | null;
  if (!rect) return false;
  await page.mouse.click(rect.x, rect.y);
  return true;
};

/** Whether the array-item slot's empty-state insert affordance is mounted — the
 *  honest signal that the slot has zero children. */
export const isArraySlotInsertVisible = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelector("[data-role='array-slot-insert']") !== null,
  ) as Promise<boolean>;

/** Click the array-item slot's empty-state insert affordance — closes the sheet
 *  and opens the catalog picker for that nested slot. Returns false when absent. */
export const clickArraySlotInsert = (page: Page) =>
  shadowQuery(page, (r) => {
    const btn = r.querySelector(
      "[data-role='array-slot-insert']",
    ) as HTMLButtonElement | null;
    if (!btn) return false;
    btn.click();
    return true;
  }) as Promise<boolean>;

/** Count editable in-sheet slot outlines (`.slot-outline`). An array-item slot
 *  must NEVER render one — it renders a read-only child list — so this is the
 *  doctrine observer: zero outlines for a component whose only slots are nested. */
export const countSheetSlotOutlines = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelectorAll(".slot-outline").length,
  ) as Promise<number>;

// --- Richtext control helpers ---

/** The viewport center of the richtext editing surface, scrolled into view.
 *  Null when no richtext control is mounted. */
const richTextEditorCenter = (page: Page) =>
  shadowQuery(page, (r) => {
    const pm = r.querySelector(
      "[data-role='richtext-editor'] .ProseMirror",
    ) as HTMLElement | null;
    if (!pm) return null;
    pm.scrollIntoView({ block: "nearest" });
    const b = pm.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }) as Promise<{ x: number; y: number } | null>;

/** Focus the richtext editor with a REAL mouse click at its center (the path a
 *  designer's pointer takes). Returns false when the control is absent. */
export const focusRichText = async (page: Page): Promise<boolean> => {
  const c = await richTextEditorCenter(page);
  if (!c) return false;
  await page.mouse.click(c.x, c.y);
  return true;
};

/** The formatting action ids the toolbar offers, in order — the honest set for
 *  the field (a member the catalog disabled with `false` is absent). */
export const readRichTextActions = (page: Page) =>
  shadowQuery(page, (r) =>
    [...r.querySelectorAll("[data-role^='richtext-action-']")].map((el) =>
      (el.getAttribute("data-role") ?? "").replace("richtext-action-", ""),
    ),
  ) as Promise<string[]>;

/** The formatting action ids currently marked active (data-active) — reflects
 *  the marks/nodes covering the live selection. */
export const readRichTextActiveActions = (page: Page) =>
  shadowQuery(page, (r) =>
    [...r.querySelectorAll("[data-role^='richtext-action-'][data-active]")].map(
      (el) =>
        (el.getAttribute("data-role") ?? "").replace("richtext-action-", ""),
    ),
  ) as Promise<string[]>;

/** Click a richtext toolbar button with a REAL mouse click. A real mousedown is
 *  required: the button runs its command on mousedown+preventDefault to keep the
 *  editor selection, so a synthetic `.click()` (no mousedown) would no-op. */
export const clickRichTextAction = async (
  page: Page,
  action: string,
): Promise<boolean> => {
  const c = (await page.evaluate((a) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
        continue;
      const btn = d.shadowRoot.querySelector(
        `[data-role='richtext-action-${a}']`,
      ) as HTMLElement | null;
      if (!btn) return null;
      btn.scrollIntoView({ block: "nearest" });
      const b = btn.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    }
    return null;
  }, action)) as { x: number; y: number } | null;
  if (!c) return false;
  await page.mouse.click(c.x, c.y);
  return true;
};

// --- Radio control helpers ---

/** Locate a `[data-role='radio-group']` root scoped by the field's visible label
 *  (the `<label>` in the shared `.prop-field` wrapper), mirroring dimensionRoot. */
const radioRoot = (root: ShadowRoot, label?: string): Element | undefined => {
  const roots = [
    ...root.querySelectorAll("[data-role='radio-group']"),
  ] as HTMLElement[];
  if (!label) return roots[0];
  return roots.find((r) => {
    const field = r.closest(".prop-field");
    return field?.querySelector("label")?.textContent?.trim() === label;
  });
};

/** A radio field's chosen layout ("segmented" | "stacked") plus every option's
 *  value, checked, and focused state — read from the overlay shadow root by
 *  data-role. `checked` reads the native input; `focused` reads shadow
 *  activeElement (containment counts — focus sits on the option's input). */
export const readRadioGroup = (page: Page, fieldLabel?: string) =>
  page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
          continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const active = d.shadowRoot.activeElement;
        return {
          layout: root.getAttribute("data-layout") ?? "",
          options: [...root.querySelectorAll("[data-role='radio-option']")].map(
            (el) => {
              const input = el.querySelector(
                "input[type='radio']",
              ) as HTMLInputElement | null;
              return {
                value: el.getAttribute("data-value") ?? "",
                checked: input?.checked ?? false,
                focused: el === active || el.contains(active),
              };
            },
          ),
        };
      }
      return null;
    },
    { label: fieldLabel, finder: radioRoot.toString() },
  ) as Promise<{
    layout: string;
    options: { value: string; checked: boolean; focused: boolean }[];
  } | null>;

/** The on-screen center of the radio option whose data-value matches, scoped to
 *  the named field — for a REAL mouse click. Null when absent. */
export const getRadioOptionCenter = (
  page: Page,
  value: string,
  fieldLabel?: string,
) =>
  page.evaluate(
    ({ wanted, label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
          continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const opts = [
          ...root.querySelectorAll("[data-role='radio-option']"),
        ] as HTMLElement[];
        const el = opts.find((o) => o.getAttribute("data-value") === wanted);
        if (!el) return null;
        el.scrollIntoView({ block: "nearest" });
        const b = el.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }
      return null;
    },
    { wanted: value, label: fieldLabel, finder: radioRoot.toString() },
  ) as Promise<{ x: number; y: number } | null>;

/** Focus the first radio option's input, scoped to the field, then press an
 *  arrow key — exercising the native roving-radio arrow navigation. Returns the
 *  value that became checked after the key, or null when the group is absent. */
export const arrowNavRadio = async (
  page: Page,
  key: "ArrowDown" | "ArrowUp" | "ArrowRight" | "ArrowLeft",
  fieldLabel?: string,
): Promise<string | null> => {
  const focused = await page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
          continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        // Focus the CHECKED radio (a comma selector returns the first input in
        // DOM order, not the checked one) so the arrow key moves from it.
        const input = (root.querySelector("input[type='radio']:checked") ??
          root.querySelector("input[type='radio']")) as HTMLInputElement | null;
        input?.focus();
        return input !== null;
      }
      return false;
    },
    { label: fieldLabel, finder: radioRoot.toString() },
  );
  if (!focused) return null;
  await page.keyboard.press(key);
  await waitFrames(page, 2);
  const group = await readRadioGroup(page, fieldLabel);
  return group?.options.find((o) => o.checked)?.value ?? null;
};

// --- Spacing control helpers ---

const spacingRoot = (root: ShadowRoot, label?: string): Element | undefined => {
  const roots = [
    ...root.querySelectorAll("[data-role='spacing']"),
  ] as HTMLElement[];
  if (!label) return roots[0];
  return roots.find((r) => {
    const field = r.closest(".prop-field");
    return field?.querySelector("label")?.textContent?.trim() === label;
  });
};

/** A spacing control's full reading scoped by field label: linked flag, chip
 *  values + checked, the linked number input's value (null when unlinked), the
 *  four side inputs (null when linked), and whether the clear sentinel is
 *  selected (unset). One pass so a test asserts the honest state in one call. */
export const readSpacing = (page: Page, fieldLabel?: string) =>
  page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
          continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const linkedInput = root.querySelector(
          "[data-role='spacing-input']",
        ) as HTMLInputElement | null;
        const sideEls = [
          ...root.querySelectorAll("[data-role='spacing-side']"),
        ] as HTMLInputElement[];
        const sides =
          sideEls.length === 0
            ? null
            : sideEls.reduce(
                (acc, el) => {
                  acc[el.getAttribute("data-side") ?? ""] = el.value;
                  return acc;
                },
                {} as Record<string, string>,
              );
        const sentinel = root.querySelector("[data-role='spacing-sentinel']");
        return {
          linked: root.hasAttribute("data-linked"),
          chips: [...root.querySelectorAll("[data-role='spacing-chip']")].map(
            (el) => ({
              value: el.getAttribute("data-value") ?? "",
              checked: el.hasAttribute("data-checked"),
            }),
          ),
          linkedInput: linkedInput ? linkedInput.value : null,
          sides,
          sentinelSelected: sentinel?.hasAttribute("data-selected") ?? false,
        };
      }
      return null;
    },
    { label: fieldLabel, finder: spacingRoot.toString() },
  ) as Promise<{
    linked: boolean;
    chips: { value: string; checked: boolean }[];
    linkedInput: string | null;
    sides: Record<string, string> | null;
    sentinelSelected: boolean;
  } | null>;

/** Click the spacing link toggle (real mouse), scoped to the field. Returns
 *  false when absent or disabled. */
export const clickSpacingLink = async (
  page: Page,
  fieldLabel?: string,
): Promise<boolean> => {
  const c = (await page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
          continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const btn = root.querySelector(
          "[data-role='spacing-link']",
        ) as HTMLButtonElement | null;
        if (!btn || btn.disabled) return null;
        btn.scrollIntoView({ block: "nearest" });
        const b = btn.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }
      return null;
    },
    { label: fieldLabel, finder: spacingRoot.toString() },
  )) as { x: number; y: number } | null;
  if (!c) return false;
  const linkedBefore = (await readSpacing(page, fieldLabel))?.linked;
  await page.mouse.click(c.x, c.y);
  await expect
    .poll(() => readSpacing(page, fieldLabel).then((s) => s?.linked))
    .toBe(!linkedBefore);
  return true;
};

/** The on-screen center of the spacing chip whose data-value matches, scoped to
 *  the field — for a REAL mouse click. Null when absent. */
export const getSpacingChipCenter = (
  page: Page,
  value: string,
  fieldLabel?: string,
) =>
  page.evaluate(
    ({ wanted, label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
          continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const chips = [
          ...root.querySelectorAll("[data-role='spacing-chip']"),
        ] as HTMLElement[];
        const el = chips.find((c) => c.getAttribute("data-value") === wanted);
        if (!el) return null;
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
        const b = el.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }
      return null;
    },
    { wanted: value, label: fieldLabel, finder: spacingRoot.toString() },
  ) as Promise<{ x: number; y: number } | null>;

/** The on-screen center of the spacing clear sentinel, scoped to the field. */
export const getSpacingSentinelCenter = (page: Page, fieldLabel?: string) =>
  page.evaluate(
    ({ label, finder }) => {
      for (const d of document.querySelectorAll("div")) {
        if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
          continue;
        const find = new Function(
          "root",
          "label",
          `return (${finder})(root, label)`,
        );
        const root = find(d.shadowRoot, label) as Element | undefined;
        if (!root) continue;
        const el = root.querySelector(
          "[data-role='spacing-sentinel']",
        ) as HTMLElement | null;
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }
      return null;
    },
    { label: fieldLabel, finder: spacingRoot.toString() },
  ) as Promise<{ x: number; y: number } | null>;

// --- Box-model helpers ---

/** Every box-model band currently painted, with its band kind ("margin" |
 *  "padding" | "content") and viewport rect. Empty when the overlay is off. */
export const readBoxModelBands = (page: Page) =>
  shadowQuery(page, (r) =>
    [...r.querySelectorAll("[data-role='box-model-band']")].map((el) => {
      const b = el.getBoundingClientRect();
      return {
        band: el.getAttribute("data-band") ?? "",
        top: b.top,
        left: b.left,
        width: b.width,
        height: b.height,
      };
    }),
  ) as Promise<
    { band: string; top: number; left: number; width: number; height: number }[]
  >;

/** Count of painted gap regions (one per visible gap between flex/grid
 *  children). Zero when the container has < 2 children or a zero gap. */
export const countGapRegions = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelectorAll("[data-role='box-model-gap-region']").length,
  ) as Promise<number>;

/** The box-model bands container's on-screen (viewport) bounding box. Lets a
 *  test verify the overlay tracks the selected element through scroll. Null
 *  when the toggle is off. */
export const getBoxModelBandsRect = (page: Page) =>
  shadowQuery(page, (r) => {
    const el = r.querySelector(
      "[data-role='box-model-bands']",
    ) as HTMLElement | null;
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: b.top, left: b.left, bottom: b.bottom, right: b.right };
  }) as Promise<{
    top: number;
    left: number;
    bottom: number;
    right: number;
  } | null>;

// --- Ghost helpers ---

/** True when the light-DOM element at `selector` currently carries the ghost
 *  marker (data-duck-ghost), set by useGhostPlaceholders while it is styled
 *  as a placeholder. Reads the light DOM directly — ghosting styles the
 *  user's own element, not an overlay affordance. */
export const isGhostStyled = (page: Page, selector: string) =>
  page.evaluate(
    (sel) =>
      document.querySelector(sel)?.hasAttribute("data-duck-ghost") ?? false,
    selector,
  ) as Promise<boolean>;

/** The light-DOM element's on-screen (viewport) bounding box at `selector`.
 *  Null when no such element exists. */
export const getGhostRect = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: b.top, left: b.left, width: b.width, height: b.height };
  }, selector) as Promise<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>;

/** Count of light-DOM elements anywhere on the page currently carrying the
 *  ghost marker. Used to prove a multi-slot component with a mix of empty
 *  and filled slots is NEVER ghosted (the container itself only qualifies
 *  when ALL its slots are empty). */
export const countGhostMarkers = (page: Page) =>
  page.evaluate(
    () => document.querySelectorAll("[data-duck-ghost]").length,
  ) as Promise<number>;

// --- Resolve helpers ---

/** True when the resolving shimmer is mounted, optionally scoped to a
 *  specific element id. */
export const isResolvingVisible = (page: Page, elementId?: string) =>
  page.evaluate((id) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
        continue;
      const sel = id
        ? `[data-role='resolve-resolving'][data-element-id='${id}']`
        : "[data-role='resolve-resolving']";
      return d.shadowRoot.querySelector(sel) !== null;
    }
    return false;
  }, elementId) as Promise<boolean>;

/** True when the resolve-error frame is mounted, optionally scoped to a
 *  specific element id. */
export const isResolveErrorVisible = (page: Page, elementId?: string) =>
  page.evaluate((id) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
        continue;
      const sel = id
        ? `[data-role='resolve-error'][data-element-id='${id}']`
        : "[data-role='resolve-error']";
      return d.shadowRoot.querySelector(sel) !== null;
    }
    return false;
  }, elementId) as Promise<boolean>;

/** The current value of a read-only sheet field (native text/textarea input),
 *  scoped by its visible label — mirrors the dimensionRoot/segmentedRoot
 *  label-scoping pattern. Null when no field with that label is rendered. */
export const getReadOnlyFieldValue = (page: Page, fieldLabel: string) =>
  page.evaluate((wanted) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
        continue;
      const fields = [
        ...d.shadowRoot.querySelectorAll(
          "[data-role='prop-sheet'] .prop-field",
        ),
      ];
      const field = fields.find(
        (f) => f.querySelector("label")?.textContent?.trim() === wanted,
      );
      if (!field) continue;
      const input = field.querySelector("input, textarea") as
        HTMLInputElement | HTMLTextAreaElement | null;
      return input ? input.value : null;
    }
    return null;
  }, fieldLabel) as Promise<string | null>;

// --- Sheet control-kind helper (re-target safety) ---

export type SheetControlKind =
  "dimension" | "spacing" | "segmented" | "swatch" | "radio-group" | null;

/** Which control root is rendered for a field, scoped by its visible label.
 *  Lets a re-target test assert a control actually SWAPPED kind in place
 *  (e.g. dimension -> spacing) rather than merely re-rendering the same kind. */
export const getSheetControlKind = (
  page: Page,
  fieldLabel: string,
): Promise<SheetControlKind> =>
  page.evaluate((wanted) => {
    const kinds = [
      "dimension",
      "spacing",
      "segmented",
      "swatch",
      "radio-group",
    ];
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
        continue;
      const fields = [
        ...d.shadowRoot.querySelectorAll(
          "[data-role='prop-sheet'] .prop-field",
        ),
      ];
      const field = fields.find(
        (f) => f.querySelector("label")?.textContent?.trim() === wanted,
      );
      if (!field) continue;
      const found = kinds.find(
        (k) => field.querySelector(`[data-role='${k}']`) !== null,
      );
      return (found ?? null) as SheetControlKind;
    }
    return null;
  }, fieldLabel) as Promise<SheetControlKind>;

// --- Disclosure trigger helpers (arrays + nested objects share the anatomy) ---

/** Every disclosure trigger in the open sheet with its label and open state.
 *  Nested-object groups (e.g. "Border") and array groups both use this anatomy. */
export const readDisclosureTriggers = (page: Page) =>
  shadowQuery(page, (r) =>
    [
      ...r.querySelectorAll(
        "[data-role='prop-sheet'] [data-role='disclosure-trigger']",
      ),
    ].map((el) => ({
      label:
        (
          el.querySelector(".disclosure-label") as HTMLElement | null
        )?.textContent?.trim() ?? "",
      open: el.getAttribute("aria-expanded") === "true",
    })),
  ) as Promise<{ label: string; open: boolean }[]>;

/** Whether the disclosure group with this label is expanded. Undefined when no
 *  trigger carries the label. */
export const isDisclosureOpen = async (page: Page, label: string) =>
  (await readDisclosureTriggers(page)).find((t) => t.label === label)?.open;

/** Click the disclosure trigger whose label matches (real mouse), so a test can
 *  open one named group without expanding every disclosure. Returns false when
 *  no trigger carries that label. */
export const clickDisclosureTrigger = async (
  page: Page,
  label: string,
): Promise<boolean> => {
  const c = (await page.evaluate((wanted) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || (d as HTMLElement).style.position !== "fixed")
        continue;
      const triggers = [
        ...d.shadowRoot.querySelectorAll(
          "[data-role='prop-sheet'] [data-role='disclosure-trigger']",
        ),
      ] as HTMLElement[];
      const el = triggers.find(
        (t) =>
          (
            t.querySelector(".disclosure-label") as HTMLElement | null
          )?.textContent?.trim() === wanted,
      );
      if (!el) return null;
      el.scrollIntoView({ block: "nearest" });
      const b = el.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    }
    return null;
  }, label)) as { x: number; y: number } | null;
  if (!c) return false;
  const openBefore = await isDisclosureOpen(page, label);
  await page.mouse.click(c.x, c.y);
  await expect.poll(() => isDisclosureOpen(page, label)).toBe(!openBefore);
  return true;
};
