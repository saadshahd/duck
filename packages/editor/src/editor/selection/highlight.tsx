const INSET = -2; // border extends outside element bounds (system.md)
const EXPAND = 4; // 2px border on each side

function outsetRect(rect: DOMRect) {
  return {
    top: rect.top + INSET,
    left: rect.left + INSET,
    width: rect.width + EXPAND,
    height: rect.height + EXPAND,
  };
}

export function HoverHighlight({ rect }: { rect: DOMRect | null }) {
  if (!rect) return null;
  return <div className="hover-highlight" style={outsetRect(rect)} />;
}

export function SelectionRing({ rect }: { rect: DOMRect | null }) {
  if (!rect) return null;
  return <div className="selection-ring" style={outsetRect(rect)} />;
}
