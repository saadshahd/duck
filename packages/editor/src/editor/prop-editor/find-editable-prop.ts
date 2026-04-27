import type { ComponentData, Field } from "@puckeditor/core";

export type ResolvedFields = Record<string, Field>;

export type EditablePropResult = {
  readonly propKey: string;
  readonly propPath: readonly (string | number)[];
  readonly value: string;
  readonly field: Field;
};

const isTextish = (field: Field): boolean =>
  field.type === "text" || field.type === "textarea";

const asEditable = (
  propKey: string,
  field: Field,
  value: unknown,
): EditablePropResult | null =>
  isTextish(field) && typeof value === "string" && value.length > 0
    ? { propKey, propPath: [propKey], value, field }
    : null;

/**
 * Find the inline-editable text/textarea prop for a component.
 *
 * Strategy:
 *  1. If `hint.propKey` is given AND that field is text/textarea AND its value is a non-empty string → return it.
 *  2. Else: scan top-level fields for the first text/textarea field whose value is a non-empty string.
 *
 * Object/array recursion is intentionally not supported — the inline editor only handles flat string props.
 */
export const findEditableProp = (
  component: ComponentData,
  fields: ResolvedFields,
  hint: { propKey?: string } = {},
): EditablePropResult | null => {
  const props = component.props as Record<string, unknown>;

  if (hint.propKey) {
    const field = fields[hint.propKey];
    if (field) {
      const match = asEditable(hint.propKey, field, props[hint.propKey]);
      if (match) return match;
    }
  }

  for (const [propKey, field] of Object.entries(fields)) {
    const match = asEditable(propKey, field, props[propKey]);
    if (match) return match;
  }

  return null;
};
