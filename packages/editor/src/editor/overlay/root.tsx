import { useEffect, useRef, useState, type ReactNode } from "react";
import root from "react-shadow";
import { ShadowContext } from "./shadow-context.js";
import { PortalContext } from "./portal-context.js";
import tokensCss from "./tokens.css?inline";

export function OverlayRoot({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    const sr = hostRef.current?.shadowRoot ?? null;
    if (!sr) return;

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(tokensCss);
    sr.adoptedStyleSheets = [sheet];

    // Portal target for react-aria-components (Popover, Tooltip).
    // Must live inside the shadow root so adoptedStyleSheets apply to portaled content.
    const div = document.createElement("div");
    sr.appendChild(div);
    setPortalContainer(div);
    setShadow(sr);

    return () => {
      if (sr.contains(div)) sr.removeChild(div);
    };
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
        <PortalContext.Provider value={portalContainer}>
          {shadow ? children : null}
        </PortalContext.Provider>
      </ShadowContext.Provider>
    </root.div>
  );
}
