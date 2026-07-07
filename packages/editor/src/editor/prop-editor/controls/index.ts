import type { ReactNode } from "react";
import type { Field } from "@puckeditor/core";
import type { FieldProps } from "../puck-fields.js";
import type { ControlId } from "../commit-mode.js";
import { Dimension } from "./dimension.js";
import { Segmented } from "./segmented.js";
import { Swatch } from "./swatch.js";

// Re-exported so control modules (T4+) and the dispatch can share one source.
export type { FieldProps };

/** Signature every registered control renderer must satisfy.
 *  Receives the same FieldProps as native type renderers. */
export type ControlRenderer<F extends Field = Field, V = unknown> = (
  props: FieldProps<F, V>,
) => ReactNode;

/** Registry: catalog-agnostic control id → renderer.
 *
 *  To register a new control:
 *  1. Create `controls/<name>.tsx` exporting a component matching `ControlRenderer`.
 *  2. Import it here and add one entry: `"<id>": MyControl`.
 *  3. Declare its commit timing in `commit-mode.ts` — omitting it breaks this
 *     `satisfies` check at compile time. */
export const controlRenderers = {
  dimension: Dimension,
  segmented: Segmented,
  swatch: Swatch,
} satisfies Partial<Record<Exclude<ControlId, Field["type"]>, ControlRenderer>>;
