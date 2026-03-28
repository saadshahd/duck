import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import root from "react-shadow";
import editorCss from "./overlay.css?inline";

const useShadowSheet = (css: string): RefObject<HTMLDivElement | null> => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shadow = hostRef.current?.shadowRoot;

    if (shadow) {
      const sheet = new CSSStyleSheet();

      sheet.replaceSync(css);
      shadow.adoptedStyleSheets = [sheet];
    }
  }, [css]);

  return hostRef;
};

export function OverlayRoot({ children }: { children: ReactNode }) {
  const hostRef = useShadowSheet(editorCss);

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
      {children}
    </root.div>
  );
}
