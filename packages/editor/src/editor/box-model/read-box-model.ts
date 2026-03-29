export type BoxModelEdges = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type GapInfo = { row: number; column: number };

export type BoxModelData = {
  margin: BoxModelEdges;
  padding: BoxModelEdges;
  border: BoxModelEdges;
  marginRect: DOMRect;
  borderRect: DOMRect;
  paddingRect: DOMRect;
  contentRect: DOMRect;
  gap: GapInfo | null;
};

const ZERO_EDGES: BoxModelEdges = { top: 0, right: 0, bottom: 0, left: 0 };

export const isZeroEdges = (e: BoxModelEdges): boolean =>
  e.top === 0 && e.right === 0 && e.bottom === 0 && e.left === 0;

const readEdges = (
  cs: CSSStyleDeclaration,
  prefix: string,
  suffix: string = "",
): BoxModelEdges => ({
  top: parseFloat(cs.getPropertyValue(`${prefix}-top${suffix}`)) || 0,
  right: parseFloat(cs.getPropertyValue(`${prefix}-right${suffix}`)) || 0,
  bottom: parseFloat(cs.getPropertyValue(`${prefix}-bottom${suffix}`)) || 0,
  left: parseFloat(cs.getPropertyValue(`${prefix}-left${suffix}`)) || 0,
});

const expandRect = (r: DOMRect, e: BoxModelEdges): DOMRect =>
  new DOMRect(
    r.x - e.left,
    r.y - e.top,
    r.width + e.left + e.right,
    r.height + e.top + e.bottom,
  );

const insetRect = (r: DOMRect, e: BoxModelEdges): DOMRect =>
  new DOMRect(
    r.x + e.left,
    r.y + e.top,
    Math.max(0, r.width - e.left - e.right),
    Math.max(0, r.height - e.top - e.bottom),
  );

const readGap = (cs: CSSStyleDeclaration): GapInfo | null => {
  const display = cs.display;
  if (!display.includes("flex") && !display.includes("grid")) return null;
  const row = parseFloat(cs.rowGap) || 0;
  const column = parseFloat(cs.columnGap) || 0;
  return row === 0 && column === 0 ? null : { row, column };
};

export function readBoxModel(el: HTMLElement): BoxModelData {
  const cs = getComputedStyle(el);
  const margin = readEdges(cs, "margin");
  const padding = readEdges(cs, "padding");
  const border = readEdges(cs, "border", "-width");
  const borderRect = el.getBoundingClientRect();
  const marginRect = expandRect(borderRect, margin);
  const paddingRect = insetRect(borderRect, border);
  const contentRect = insetRect(paddingRect, padding);
  const gap = readGap(cs);

  return {
    margin,
    padding,
    border,
    marginRect,
    borderRect,
    paddingRect,
    contentRect,
    gap,
  };
}

/** Check whether any spacing exists worth visualizing. */
export const hasVisibleSpacing = (data: BoxModelData): boolean =>
  !isZeroEdges(data.margin) ||
  !isZeroEdges(data.padding) ||
  !isZeroEdges(data.border) ||
  data.gap !== null;
