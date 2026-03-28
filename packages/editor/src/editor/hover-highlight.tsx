const BASE_STYLE: React.CSSProperties = {
  position: "absolute",
  border: "2px solid rgba(59, 130, 246, 0.5)",
  borderRadius: "4px",
  pointerEvents: "none",
  transition: "all 150ms ease",
};

export function HoverHighlight({ rect }: { rect: DOMRect | null }) {
  if (!rect) return null;
  return (
    <div
      style={{
        ...BASE_STYLE,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}
