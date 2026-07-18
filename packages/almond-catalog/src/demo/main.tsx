import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { EditorApp } from "./editor-app";
import { InventoryApp } from "./inventory-app";
import { PagesApp } from "./pages-app";

type View = "editor" | "pages" | "studio" | "inventory";

const VIEWS: { id: View; label: string }[] = [
  { id: "editor", label: "Editor" },
  { id: "pages", label: "Pages (read-only)" },
  { id: "studio", label: "Component studio" },
  { id: "inventory", label: "Inventory" },
];

const tabBar: React.CSSProperties = {
  display: "flex",
  gap: "6px",
  padding: "8px 16px",
  background: "#17171a",
  borderBottom: "1px solid rgba(255,255,255,.12)",
  fontFamily: "system-ui, sans-serif",
};

function tab(active: boolean): React.CSSProperties {
  return {
    font: "inherit",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    padding: "7px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,.12)",
    background: active ? "#e9e9ee" : "transparent",
    color: active ? "#17171a" : "#e9e9ee",
  };
}

/** Demo shell: the T11 Pages harness, the component studio, and the T13 inventory route. */
function Demo() {
  const [view, setView] = useState<View>("editor");
  return (
    <>
      <div style={tabBar}>
        {VIEWS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-pressed={view === id}
            style={tab(view === id)}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "editor" ? (
        <EditorApp />
      ) : view === "pages" ? (
        <PagesApp />
      ) : view === "studio" ? (
        <App />
      ) : (
        <InventoryApp />
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
