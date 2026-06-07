import type { ReactNode } from "react";
import type { Field } from "@puckeditor/core";

// Re-exported so control modules (T4+) and the dispatch can share one source.
export type { FieldProps } from "../puck-fields.js";

/** Signature every registered control renderer must satisfy.
 *  Receives the same FieldProps as native type renderers. */
export type ControlRenderer<F extends Field = Field, V = unknown> = (
  props: import("../puck-fields.js").FieldProps<F, V>,
) => ReactNode;

/** Registry: catalog-agnostic control id → renderer.
 *  Empty until T4/T5/T6 add entries.
 *
 *  To register a new control:
 *  1. Create `controls/<name>.tsx` exporting a component matching `ControlRenderer`.
 *  2. Import it here and add one entry: `"<id>": MyControl`.
 *
 *  Example (T4 will do this for "segmented"):
 *  ```ts
 *  import { SegmentedControl } from "./segmented.js";
 *  export const controlRenderers = { segmented: SegmentedControl } satisfies Record<string, ControlRenderer>;
 *  ``` */
export const controlRenderers: Record<string, ControlRenderer> =
  {} satisfies Record<string, ControlRenderer>;
