export function HoverHighlight({ rect }: { rect: DOMRect | null }) {
  if (!rect) return null;
  return (
    <div
      className="hover-highlight"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}

export function SelectionRing({ rect }: { rect: DOMRect | null }) {
  if (!rect) return null;
  return (
    <div
      className="selection-ring"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}
