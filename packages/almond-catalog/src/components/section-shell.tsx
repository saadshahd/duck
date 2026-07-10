/**
 * SectionShell — the theming + rhythm primitive shared by every organism (sp-64 §3.3).
 *
 * Wires a section subtree to the T1 token engine via `data-theme` (so the emitted
 * `[data-theme="…"]` block paints this subtree's tokens), owns the section's block/
 * inline padding, and declares `position: relative` — ⑤ decision 10, so a section's
 * morph picker anchors to the section itself, never to `<main>`. Not a registered
 * Puck component; organisms (T5/T6) compose it as their outermost element.
 */

import type { ReactNode } from "react";
import type { ThemeName } from "../tokens/themes";
import "./section-shell.css";

export interface SectionShellProps {
  theme: ThemeName;
  children: ReactNode;
}

export function SectionShell({ theme, children }: SectionShellProps) {
  return (
    <section className="almond-section" data-theme={theme}>
      {children}
    </section>
  );
}
