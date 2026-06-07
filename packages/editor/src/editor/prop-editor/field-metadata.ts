import type { Field } from "@puckeditor/core";

/** Typed accessors for generic catalog annotations on a Puck field.
 *  The editor reads only these keys — it never inspects component names.
 *  Values come from `field.metadata`, which Puck types as `{ [key: string]: any }`.
 *  Each accessor narrows to `string | undefined`; non-string values are treated as absent. */
const control = (field: Field): string | undefined => {
  const v = (field as { metadata?: Record<string, unknown> }).metadata?.control;
  return typeof v === "string" ? v : undefined;
};

const unit = (field: Field): string | undefined => {
  const v = (field as { metadata?: Record<string, unknown> }).metadata?.unit;
  return typeof v === "string" ? v : undefined;
};

const group = (field: Field): string | undefined => {
  const v = (field as { metadata?: Record<string, unknown> }).metadata?.group;
  return typeof v === "string" ? v : undefined;
};

export const FieldMetadata = { control, unit, group } as const;
