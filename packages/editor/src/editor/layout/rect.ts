export type Edges = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const expandRect = (r: DOMRect, e: Edges): DOMRect =>
  new DOMRect(
    r.x - e.left,
    r.y - e.top,
    r.width + e.left + e.right,
    r.height + e.top + e.bottom,
  );

export const insetRect = (r: DOMRect, e: Edges): DOMRect =>
  new DOMRect(
    r.x + e.left,
    r.y + e.top,
    Math.max(0, r.width - e.left - e.right),
    Math.max(0, r.height - e.top - e.bottom),
  );

export const rectsOverlap = (a: DOMRect, b: DOMRect): boolean =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

export const containsPoint = (
  r: DOMRect,
  p: { x: number; y: number },
): boolean =>
  p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;

const unionPair = (a: DOMRect, b: DOMRect): DOMRect => {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  return new DOMRect(
    left,
    top,
    Math.max(a.right, b.right) - left,
    Math.max(a.bottom, b.bottom) - top,
  );
};

/** Bounding box of all rects. Empty input is a defect — throws. */
export const unionRects = (rects: readonly DOMRect[]): DOMRect =>
  rects.reduce(unionPair);

export const intersectRect = (a: DOMRect, b: DOMRect): DOMRect => {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  return new DOMRect(
    left,
    top,
    Math.max(0, Math.min(a.right, b.right) - left),
    Math.max(0, Math.min(a.bottom, b.bottom) - top),
  );
};

export const isCollapsed = (r: DOMRect, threshold = 1): boolean =>
  r.width <= threshold || r.height <= threshold;

export const ZERO_RECT: DOMRect = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  toJSON: () => ({}),
};
