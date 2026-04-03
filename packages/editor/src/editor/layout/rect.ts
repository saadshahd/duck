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
