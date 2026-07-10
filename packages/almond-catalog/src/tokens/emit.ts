/**
 * Emit the whole theme×mode matrix as a CSS string.
 *
 * Dark is page-global (`.mode-dark` on the render root); theme is section-scoped
 * (`data-theme` per subtree). A mixed-theme page therefore dark-toggles as a whole,
 * while each section keeps its own brand.
 */

import { CONTRACT } from "./contract";
import { deriveAll, type ThemeMode } from "./derive";

function block(selector: string, mode: ThemeMode): string {
  const decls = CONTRACT.map((token) => `${token}:${mode.vars[token]};`).join(
    "",
  );
  return `${selector}{${decls}}`;
}

export function emitThemeCss(): string {
  let css = "";
  for (const theme of deriveAll()) {
    css += block(`[data-theme="${theme.name}"]`, theme.light);
    css += block(`.mode-dark [data-theme="${theme.name}"]`, theme.dark);
  }
  return css;
}
