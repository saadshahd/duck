/**
 * Inventory harness (T13) — a first-class browsable route showing the full component
 * inventory: every registered atom, molecule, organism, and widget, grouped by atomic
 * layer, each rendered live through Puck's real `<Render>` under one selectable theme.
 *
 * The proof (Frost's "show the atoms"): the markup never changes; swap the global theme and
 * every component reskins from the emitted token matrix — the "one system" claim, made
 * browsable. The switcher chrome is the demo "studio", NOT Almond: it deliberately ignores
 * the token contract.
 *
 * A component's presentational variants (`variantFields`) render as labelled strips — one
 * live instance per option — so the inventory shows range, not just a single default pose.
 */

import { Render } from "@puckeditor/core";
import { useState } from "react";
import { config } from "../puck.config";
import { emitThemeCss } from "../tokens/emit";
import { THEME_ORDER, THEMES, type ThemeName } from "../tokens/themes";
import {
  type VariantField,
  inventoryDoc,
  inventoryGroups,
  variantFields,
} from "./inventory";

const GROUPS = inventoryGroups(config);
const THEME_CSS = emitThemeCss();

export function InventoryApp() {
  const [theme, setTheme] = useState<ThemeName>("personal");
  const [dark, setDark] = useState(false);

  return (
    <div className={dark ? "mode-dark" : undefined} style={shell}>
      <style>{THEME_CSS}</style>

      <div style={bar}>
        {THEME_ORDER.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTheme(name)}
            aria-pressed={name === theme}
            style={swatch(name === theme)}
          >
            {THEMES[name].label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setDark((d) => !d)}
          aria-pressed={dark}
          style={swatch(dark)}
        >
          {dark ? "◑ Dark" : "◐ Light"}
        </button>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} style={groupBlock}>
          <h2 style={groupTitle}>{group.title}</h2>
          <div style={cardGrid}>
            {group.types.map((type) => (
              <ComponentCard key={type} type={type} theme={theme} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ComponentCard({ type, theme }: { type: string; theme: ThemeName }) {
  const axes = variantFields(config.components[type]);
  return (
    <article style={card}>
      <header style={cardHead}>{type}</header>
      {axes.length === 0 ? (
        <Preview type={type} theme={theme} prefix={`inv-${type}`} />
      ) : (
        axes.map((axis) => (
          <VariantStrip key={axis.key} type={type} theme={theme} axis={axis} />
        ))
      )}
    </article>
  );
}

function VariantStrip({
  type,
  theme,
  axis,
}: {
  type: string;
  theme: ThemeName;
  axis: VariantField;
}) {
  return (
    <div>
      <span style={axisLabel}>{axis.key}</span>
      <div style={optionRow}>
        {axis.options.map((option) => {
          const value = String(option.value);
          return (
            <div key={value} style={optionCell}>
              <span style={optionTag}>{option.label}</span>
              <Preview
                type={type}
                theme={theme}
                prefix={`inv-${type}-${axis.key}-${value}`}
                override={{ [axis.key]: option.value }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Preview({
  type,
  theme,
  prefix,
  override,
}: {
  type: string;
  theme: ThemeName;
  prefix: string;
  override?: Record<string, unknown>;
}) {
  const doc = inventoryDoc({ config, type, theme, prefix, override });
  return (
    <div data-theme={theme} style={previewSurface}>
      <Render config={config} data={doc} />
    </div>
  );
}

const shell: React.CSSProperties = {
  fontFamily: "system-ui, sans-serif",
  minHeight: "100vh",
  background: "#0e0e10",
  color: "#e9e9ee",
  padding: "0 0 64px",
};

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

const groupBlock: React.CSSProperties = {
  padding: "8px 16px",
  display: "grid",
  gap: "12px",
};

const groupTitle: React.CSSProperties = {
  margin: "16px 0 0",
  fontSize: "13px",
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "#b9b9c2",
};

const cardGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "16px",
  alignItems: "start",
};

const card: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.03)",
  minWidth: 0,
};

const cardHead: React.CSSProperties = {
  fontFamily: "ui-monospace, monospace",
  fontSize: "13px",
  fontWeight: 600,
  color: "#e9e9ee",
};

const axisLabel: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontSize: "11px",
  fontFamily: "ui-monospace, monospace",
  color: "#8a8a95",
};

const optionRow: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const optionCell: React.CSSProperties = {
  display: "grid",
  gap: "6px",
  minWidth: 0,
};

const optionTag: React.CSSProperties = {
  fontSize: "11px",
  color: "#b9b9c2",
};

const previewSurface: React.CSSProperties = {
  background: "hsl(var(--background))",
  color: "hsl(var(--foreground))",
  borderRadius: "10px",
  overflow: "hidden",
  border: "1px solid hsl(var(--border))",
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
