/**
 * Leaf module for label humanization. Both the native renderers in
 * puck-fields.tsx and the registered control renderers in controls/ import
 * from here — nothing in this module imports from either, so it terminates
 * the same way field-shell.tsx does (see that file's header comment).
 */

const ACRONYM = /^[A-Z]+$/;

/** Split a single token into words at camelCase boundaries, e.g.
 *  "imageURL" -> ["image", "URL"], "marginBottom" -> ["margin", "Bottom"]. */
const splitCamel = (token: string): string[] =>
  token
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(" ")
    .filter(Boolean);

/** Lowercase a word unless it reads as an acronym (all-uppercase, 2+ chars),
 *  which is preserved verbatim; capitalize only the sentence's first word. */
const formatWord = (word: string, isFirst: boolean): string => {
  if (ACRONYM.test(word) && word.length > 1) return word;
  const lower = word.toLowerCase();
  return isFirst ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
};

/** Derive a sentence-case display label from a raw field/object key.
 *  Handles camelCase, snake_case, kebab-case, acronyms (imageURL, id),
 *  already-spaced keys, single words, and empty strings. Never call this on
 *  catalog- or user-authored strings (field.label, option.label) — those are
 *  honest data and must render verbatim. */
export const humanizeLabel = (key: string): string => {
  const words = key.split(/[_\-\s]+/).flatMap(splitCamel);
  return words.map((w, i) => formatWord(w, i === 0)).join(" ");
};

/** Explicit field.label always wins over the derived key label. */
export const toDisplayLabel = (key: string, override?: string): string =>
  override ?? humanizeLabel(key);
