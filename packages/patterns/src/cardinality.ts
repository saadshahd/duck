import type { Cardinality } from "./types.js";

export function isRequired(c: Cardinality): boolean {
  return c.kind === "first" || c.kind === "many";
}

export function isPlural(c: Cardinality): boolean {
  return c.kind === "many" || c.kind === "any";
}
