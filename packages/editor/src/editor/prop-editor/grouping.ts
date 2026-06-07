import type { Field } from "@puckeditor/core";

export type FieldBin = "primary" | "disclosed" | "slot";

const STRUCTURAL = new Set<Field["type"]>(["object", "array"]);

/** Catalog-agnostic bin from field type alone: structural → disclosed, slot →
 *  its own zone, everything scalar (incl. unknown fallbacks) → primary. */
export const binOf = (field: Field): FieldBin =>
  field.type === "slot"
    ? "slot"
    : STRUCTURAL.has(field.type)
      ? "disclosed"
      : "primary";

const ORDER: FieldBin[] = ["primary", "disclosed", "slot"];

/** Top-level fields reordered primary → disclosed → slot, declaration order
 *  preserved within each bin. */
export const grouped = (fields: Record<string, Field>): [string, Field][] =>
  ORDER.flatMap((bin) =>
    Object.entries(fields).filter(([, f]) => binOf(f) === bin),
  );
