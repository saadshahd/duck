import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { PagesApp } from "./pages-app";

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

/** Demo shell: the T11 Pages harness and the component studio, side by side. */
function Demo() {
  const [view, setView] = useState<"pages" | "studio">("pages");
  return (
    <>
      <div style={tabBar}>
        <button
          type="button"
          onClick={() => setView("pages")}
          aria-pressed={view === "pages"}
          style={tab(view === "pages")}
        >
          Pages
        </button>
        <button
          type="button"
          onClick={() => setView("studio")}
          aria-pressed={view === "studio"}
          style={tab(view === "studio")}
        >
          Component studio
        </button>
      </div>
      {view === "pages" ? <PagesApp /> : <App />}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
