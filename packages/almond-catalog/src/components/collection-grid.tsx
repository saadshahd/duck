/**
 * CollectionGrid — the layout-contract primitive (sp-64 §4).
 *
 * Owns the responsive column grammar for every collection organism: declared
 * `columns` per breakpoint plus one `degrade` rule that decides how the grid absorbs
 * its actual child count, so rhythm can't break at ANY count (n=0 included). DS-fixed,
 * never an editor field. Not a registered Puck component; each collection organism
 * (T5) composes it around its homogeneous molecule slot.
 *
 * The column arithmetic is the pure `resolveColumns` engine below; the component only
 * counts its children and projects the result onto four `--cols-*` custom properties
 * the colocated stylesheet consumes at each breakpoint.
 */

import { Children, type CSSProperties, type ReactNode } from "react";
import "./collection-grid.css";

export type Breakpoint = "base" | "sm" | "md" | "lg";

export interface Columns {
  base: number;
  sm?: number;
  md?: number;
  lg?: number;
}

/** How the grid reconciles its declared columns with the actual child count. */
export type Degrade =
  | { rule: "reflow" } // keep the declared columns; items wrap, ghost tracks stay
  | { rule: "balance" } // never more columns than items; collapse ghost tracks
  | { rule: "cap"; max: number }; // hard column ceiling; items beyond wrap

function assertNever(x: never): never {
  throw new Error(`Unhandled degrade rule: ${JSON.stringify(x)}`);
}

/** Fill unspecified breakpoints from the nearest smaller one (mobile-first cascade). */
function declaredColumns(columns: Columns): Record<Breakpoint, number> {
  const base = columns.base;
  const sm = columns.sm ?? base;
  const md = columns.md ?? sm;
  const lg = columns.lg ?? md;
  return { base, sm, md, lg };
}

function effectiveColumns(input: {
  declared: number;
  count: number;
  degrade: Degrade;
}): number {
  const { declared, count, degrade } = input;
  switch (degrade.rule) {
    case "reflow":
      return declared;
    case "balance":
      return count === 0 ? declared : Math.min(declared, count);
    case "cap":
      return Math.min(declared, degrade.max);
    default:
      return assertNever(degrade);
  }
}

/**
 * The layout-contract engine: given the declared columns, the real child count, and
 * the degrade rule, the effective column count per breakpoint. Pure — unit tests
 * exercise it across counts × rules.
 */
export function resolveColumns(input: {
  columns: Columns;
  count: number;
  degrade: Degrade;
}): Record<Breakpoint, number> {
  const declared = declaredColumns(input.columns);
  const at = (d: number) =>
    effectiveColumns({
      declared: d,
      count: input.count,
      degrade: input.degrade,
    });
  return {
    base: at(declared.base),
    sm: at(declared.sm),
    md: at(declared.md),
    lg: at(declared.lg),
  };
}

export interface CollectionGridProps {
  columns: Columns;
  degrade: Degrade;
  children: ReactNode;
}

export function CollectionGrid({
  columns,
  degrade,
  children,
}: CollectionGridProps) {
  const count = Children.count(children);
  const cols = resolveColumns({ columns, count, degrade });
  // Custom properties aren't in React's CSSProperties key set; the cast is the
  // standard bridge for CSS-variable style objects.
  const style = {
    "--cols-base": cols.base,
    "--cols-sm": cols.sm,
    "--cols-md": cols.md,
    "--cols-lg": cols.lg,
  } as CSSProperties;
  return (
    <div className="almond-grid" style={style}>
      {children}
    </div>
  );
}
