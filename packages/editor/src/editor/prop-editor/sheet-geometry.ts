/** The sheet's fixed width. Single source for the panel width, the tether's
 *  sheet-edge x, and the occlusion reserve-width. Mirrors --sheet-width in CSS. */
export const SHEET_WIDTH = 320;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export type TetherEndpoints = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  hidden: boolean;
};

/** Endpoints for the tether <line>: sheet end fixed at the sheet's left edge
 *  (vertically centered on the element), element end at the element's right-edge
 *  midpoint clamped to the sheet column. Hidden when the element is fully out of
 *  view — the tether is a legibility aid, not load-bearing. */
export const tetherEndpoints = (
  rect: DOMRect,
  viewport: { width: number; height: number },
): TetherEndpoints => {
  const hidden = rect.bottom < 0 || rect.top > viewport.height;
  const sheetLeft = viewport.width - SHEET_WIDTH;
  const cy = (rect.top + rect.bottom) / 2;
  const y = clamp(cy, 8, viewport.height - 8);
  return {
    x2: sheetLeft,
    y2: y,
    x1: Math.min(rect.right, sheetLeft),
    y1: y,
    hidden,
  };
};
