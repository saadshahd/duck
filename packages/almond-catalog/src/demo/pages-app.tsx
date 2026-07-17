/**
 * Pages harness — renders each of the 8 Almond pages (T11) through Puck's real `<Render>`,
 * wrapped in the fixed Header/Footer chrome under the page-default theme. The switcher chrome
 * is the demo "studio", NOT Almond: it deliberately ignores the token contract.
 *
 * The proof: every page is the same recomposed organism set; each organism themes its own
 * subtree via its `data-theme`, so a page reads as one system, and a page may host a section
 * in a different theme (the Personal landing's Business-themed close).
 */

import { Render } from "@puckeditor/core";
import { useMemo, useState } from "react";
import { Footer } from "../chrome/footer";
import { Header } from "../chrome/header";
import { PAGES } from "../pages";
import { config } from "../puck.config";
import { emitThemeCss } from "../tokens/emit";
import { THEMES } from "../tokens/themes";

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

export function PagesApp() {
  const css = useMemo(() => emitThemeCss(), []);
  const [pageId, setPageId] = useState(PAGES[0].id);
  const [dark, setDark] = useState(false);

  const page = PAGES.find((p) => p.id === pageId) ?? PAGES[0];

  return (
    <div className={dark ? "mode-dark" : undefined}>
      <style>{css}</style>

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
      <main>
        <Render config={config} data={page.data} />
      </main>
      <Footer theme={page.defaultTheme} {...page.footer} />
    </div>
  );
}

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
