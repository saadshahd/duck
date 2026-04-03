import type { UIElement } from "@json-render/core";
import type { ZodTypeAny } from "zod";
import { shapeEntries, isString } from "./zod-inspect.js";

export type EditableMatch = { propKey: string; value: string };

const normalize = (s: string) => s.trim().replace(/\s+/g, " ");

/**
 * Given a selected element and the rendered text the user double-clicked,
 * find the string prop that produced that text.
 *
 * Matches by trimmed, whitespace-normalized comparison — handles
 * collapsed spaces in rendered text vs raw prop value.
 * Returns null if no match or ambiguous (multiple props match).
 */
const stringProps = (element: UIElement, schema: ZodTypeAny) =>
  shapeEntries(schema)
    .filter(([, type]) => isString(type))
    .filter(([key]) => typeof element.props[key] === "string")
    .map(([key]) => ({ propKey: key, value: element.props[key] as string }));

export const findEditableProp = (
  element: UIElement,
  schema: ZodTypeAny,
  renderedText: string,
): EditableMatch | null => {
  const target = normalize(renderedText);
  const matches = stringProps(element, schema).filter(
    (m) => normalize(m.value) === target,
  );
  return matches.length === 1 ? matches[0] : null;
};

export const findSingleEditableProp = (
  element: UIElement,
  schema: ZodTypeAny,
): EditableMatch | null => {
  const matches = stringProps(element, schema);
  return matches.length === 1 ? matches[0] : null;
};
