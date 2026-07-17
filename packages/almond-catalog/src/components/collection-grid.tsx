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

import {
  Children,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { Density } from "./density-field";
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
      {count === 0 ? <EmptyAffordance /> : children}
    </div>
  );
}

/**
 * The add-first affordance a collection paints when it holds no items (sp-64 §7.2 —
 * the collection category's critical state). A full-bleed placeholder that spans every
 * declared track (`grid-column: 1 / -1`), so the layout-contract still emits its columns
 * while the empty section reads as a slot inviting its first item. Non-interactive: the
 * catalog owns the honest empty signal, the editor overlays the actual add.
 */
function EmptyAffordance() {
  return (
    <div className="almond-grid__empty" role="note">
      Add the first item
    </div>
  );
}

/** A whole layout-contract bundle a `density` value names (sp-64 §5.3): declared columns
 *  plus the degrade rule, resolved together — never a bare column number. */
export interface DensityBundle {
  columns: Columns;
  degrade: Degrade;
}

/**
 * The two stable `as`-body components a collection organism swaps between on a `density`
 * morph — one per density value, each baking its DS-authored bundle around `CollectionGrid`.
 *
 * Called once at module scope per organism so each body's component identity is stable
 * across renders (Puck's DropZone `as` forwards no props, so the bundle can't ride through a
 * single body — the T3/T5 grid-children rider); flipping `density` deliberately swaps which
 * stable body renders, which remounts the slot subtree — acceptable for a rare morph.
 * `wrapClassName`, when given, wraps the grid in a div carrying that class (StepsSection
 * needs it as the `counter-reset` ancestor of every step — T4 rider).
 */
export function densityBodies(
  bundles: Record<Density, DensityBundle>,
  wrapClassName?: string,
): Record<Density, ComponentType<{ children?: ReactNode }>> {
  const make = (
    bundle: DensityBundle,
  ): ComponentType<{ children?: ReactNode }> =>
    function DensityBody({ children }: { children?: ReactNode }) {
      const grid = (
        <CollectionGrid columns={bundle.columns} degrade={bundle.degrade}>
          {children}
        </CollectionGrid>
      );
      return wrapClassName ? <div className={wrapClassName}>{grid}</div> : grid;
    };
  return {
    comfortable: make(bundles.comfortable),
    compact: make(bundles.compact),
  };
}
