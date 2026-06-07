import type { Field } from "@puckeditor/core";

/** Typed accessors for generic catalog annotations on a Puck field.
 *  The editor reads only these keys — it never inspects component names.
 *  Values come from `field.metadata`, which Puck types as `{ [key: string]: any }`.
 *  Each accessor narrows to `string | undefined`; non-string values are treated as absent. */
const read = (field: Field, key: string): string | undefined => {
  const v = (field as { metadata?: Record<string, unknown> }).metadata?.[key];
  return typeof v === "string" ? v : undefined;
};

const control = (field: Field) => read(field, "control");
const unit = (field: Field) => read(field, "unit");
const group = (field: Field) => read(field, "group");

export const FieldMetadata = { control, unit, group } as const;
