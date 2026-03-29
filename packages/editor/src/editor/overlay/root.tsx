import { useEffect, useRef, useState, type ReactNode } from "react";
import root from "react-shadow";
import { ShadowContext } from "./shadow-context.js";
import tokensCss from "./tokens.css?inline";

export function OverlayRoot({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    const sr = hostRef.current?.shadowRoot ?? null;
    if (!sr) return;

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(tokensCss);
    sr.adoptedStyleSheets = [sheet];

    setShadow(sr);
  }, []);

  return (
    <root.div
      ref={hostRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        pointerEvents: "none",
      }}
    >
      <ShadowContext.Provider value={shadow}>
        {shadow ? children : null}
      </ShadowContext.Provider>
    </root.div>
  );
}
