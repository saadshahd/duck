/**
 * CSS box-shorthand ⇄ four sides, for the spacing control.
 *
 * A spacing prop is stored as one CSS string of 1–4 whitespace tokens
 * ("2rem", "1rem 0", "0 auto", "8px 12px 8px 12px"). The control edits four
 * sides; this module is the honest bridge between the two shapes. Tokens are
 * kept verbatim (units and keywords like "auto" survive) — nothing is coerced.
 */

export type Sides = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

const EMPTY: Sides = { top: "", right: "", bottom: "", left: "" };

/** Expand a 1–4 token shorthand into four sides (CSS clockwise-from-top rules).
 *  A blank/whitespace value → all sides empty. Extra tokens past four are
 *  ignored (a malformed value never throws — the first four win). */
export const parseSides = (value: string): Sides => {
  const t = value.trim();
  if (!t) return EMPTY;
  const tokens = t.split(/\s+/);
  const [a, b, c, d] = tokens;
  switch (tokens.length) {
    case 1:
      return { top: a, right: a, bottom: a, left: a };
    case 2:
      return { top: a, right: b, bottom: a, left: b };
    case 3:
      return { top: a, right: b, bottom: c, left: b };
    default:
      return { top: a, right: b, bottom: c, left: d };
  }
};

/** All four sides equal (or all empty) — the value reads as one linked token. */
export const isLinked = (sides: Sides): boolean =>
  sides.top === sides.right &&
  sides.right === sides.bottom &&
  sides.bottom === sides.left;

/** Collapse four sides to the shortest equivalent CSS shorthand. All-empty → ""
 *  (unset). An emptied single side becomes "0" — the CSS default for an
 *  unspecified spacing side — so the shorthand stays valid; a fully-empty value
 *  is the only unset. */
export const formatSides = (sides: Sides): string => {
  if (!sides.top && !sides.right && !sides.bottom && !sides.left) return "";
  const top = sides.top || "0";
  const right = sides.right || "0";
  const bottom = sides.bottom || "0";
  const left = sides.left || "0";
  if (top === right && right === bottom && bottom === left) return top;
  if (top === bottom && right === left) return `${top} ${right}`;
  if (right === left) return `${top} ${right} ${bottom}`;
  return `${top} ${right} ${bottom} ${left}`;
};
