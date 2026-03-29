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
export const findEditableProp = (
  element: UIElement,
  schema: ZodTypeAny,
  renderedText: string,
): EditableMatch | null => {
  const target = normalize(renderedText);

  const matches = shapeEntries(schema)
    .filter(([, type]) => isString(type))
    .filter(
      ([key]) =>
        typeof element.props[key] === "string" &&
        normalize(element.props[key] as string) === target,
    )
    .map(([key]) => ({ propKey: key, value: element.props[key] as string }));

  return matches.length === 1 ? matches[0] : null;
};
