/**
 * Shared page-harness chrome for the demo's two page surfaces: the read-only
 * `<Render>` harness (PagesApp) and the interactive `<Editor>` harness (EditorApp).
 * Both are the same switcher over the 8 Almond pages under fixed Header/Footer chrome
 * (§3.4) plus a light/dark toggle — they differ ONLY in what fills `<main>`, supplied
 * as the `renderPage` prop. The switcher chrome is deliberately un-themed studio UI,
 * NOT Almond: it ignores the token contract.
 */

import type { ReactNode } from "react";
import { useState } from "react";
import { Footer } from "../chrome/footer";
import { Header } from "../chrome/header";
import { PAGES } from "../pages";
import type { AlmondPage } from "../pages/page";
import { emitThemeCss } from "../tokens/emit";
import { THEMES } from "../tokens/themes";

const THEME_CSS = emitThemeCss();

export function PageHarness({
  renderPage,
}: {
  renderPage: (page: AlmondPage) => ReactNode;
}) {
  const [pageId, setPageId] = useState(PAGES[0].id);
  const [dark, setDark] = useState(false);

  const page = PAGES.find((p) => p.id === pageId) ?? PAGES[0];

  return (
    <div className={dark ? "mode-dark" : undefined}>
      <style>{THEME_CSS}</style>

      <div style={bar}>
        {PAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPageId(p.id)}
            aria-pressed={p.id === pageId}
            style={swatch(p.id === pageId)}
          >
            {p.title}
          </button>
        ))}
        <span
          style={{ marginInlineStart: "auto", display: "flex", gap: "6px" }}
        >
          <span style={tag}>{THEMES[page.defaultTheme].label}</span>
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            aria-pressed={dark}
            style={swatch(dark)}
          >
            {dark ? "◑ Dark" : "◐ Light"}
          </button>
        </span>
      </div>

      <Header theme={page.defaultTheme} {...page.header} />
      <main>{renderPage(page)}</main>
      <Footer theme={page.defaultTheme} {...page.footer} />
    </div>
  );
}

const bar: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
  alignItems: "center",
  padding: "10px 16px",
  background: "#0e0e10",
  borderBottom: "1px solid rgba(255,255,255,.12)",
};

function swatch(active: boolean): React.CSSProperties {
  return {
    font: "inherit",
    fontSize: "13px",
    cursor: "pointer",
    padding: "7px 11px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,.12)",
    background: active ? "#e9e9ee" : "rgba(255,255,255,.06)",
    color: active ? "#17171a" : "#e9e9ee",
  };
}

const tag: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 11px",
  borderRadius: "8px",
  fontSize: "12px",
  fontFamily: "ui-monospace, monospace",
  color: "#b9b9c2",
  border: "1px solid rgba(255,255,255,.12)",
};
