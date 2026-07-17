/**
 * Header — fixed app-shell chrome (sp-64 §3.4).
 *
 * NOT a registered Puck component: it lives outside the editable content tree, so it is
 * never add/remove/move/empty-reachable. Its prop surface is per-page metadata the demo
 * shell passes in, never an editor field. It paints under the page-default `theme` (§3.4:
 * chrome takes a page-default theme, not a per-instance enum), so a `data-theme` root wires
 * it to the same emitted token block every organism uses.
 */

import type { ThemeName } from "../tokens/themes";
import "./header.css";

export interface NavLink {
  label: string;
  href: string;
}

/** The per-page prop surface (§3.4), minus the page-default theme the shell supplies. */
export interface HeaderContent {
  brand: string;
  navItems: NavLink[];
  cta: NavLink;
}

export interface HeaderProps extends HeaderContent {
  theme: ThemeName;
}

export function Header({ theme, brand, navItems, cta }: HeaderProps) {
  return (
    <header className="almond-header" data-theme={theme}>
      <a className="almond-header__brand" href="#">
        {brand}
      </a>
      <nav className="almond-header__nav" aria-label="Primary">
        {navItems.map((item) => (
          <a
            key={`${item.href}-${item.label}`}
            className="almond-header__link"
            href={item.href}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <a className="almond-header__cta" href={cta.href}>
        {cta.label}
      </a>
    </header>
  );
}
