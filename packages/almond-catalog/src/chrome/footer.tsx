/**
 * Footer — fixed app-shell chrome (sp-64 §3.4, §6).
 *
 * NOT a registered Puck component: outside the editable tree, never add/remove/move/empty-
 * reachable. Link columns + locale/currency are per-page metadata; `disclosures` names the
 * pre-cleared snippet ids resolved TOTAL-ly through `disclosures.ts` (§6) — the footer picks
 * WHICH approved fine-print shows, never its wording, and a stale id is silently dropped
 * rather than inventing a legal statement. Paints under the page-default `theme` (§3.4).
 */

import type { ThemeName } from "../tokens/themes";
import { resolveDisclosures } from "../data/disclosures";
import type { NavLink } from "./header";
import "./footer.css";

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

/** The per-page prop surface (§3.4), minus the page-default theme the shell supplies. */
export interface FooterContent {
  linkColumns: FooterColumn[];
  locale: string;
  currency: string;
  disclosures: string[];
}

export interface FooterProps extends FooterContent {
  theme: ThemeName;
}

export function Footer({
  theme,
  linkColumns,
  locale,
  currency,
  disclosures,
}: FooterProps) {
  const snippets = resolveDisclosures(disclosures);
  return (
    <footer className="almond-footer" data-theme={theme}>
      <div className="almond-footer__columns">
        {linkColumns.map((column) => (
          <nav
            key={column.title}
            className="almond-footer__column"
            aria-label={column.title}
          >
            <h2 className="almond-footer__title">{column.title}</h2>
            <ul className="almond-footer__links">
              {column.links.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <a className="almond-footer__link" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {snippets.length > 0 ? (
        <div className="almond-footer__disclosures">
          {snippets.map((snippet) => (
            <p key={snippet.id} className="almond-footer__disclosure">
              {snippet.body}
            </p>
          ))}
        </div>
      ) : null}

      <div className="almond-footer__meta">
        <span>
          {locale} · {currency}
        </span>
        <span>© Almond</span>
      </div>
    </footer>
  );
}
