import { useEffect } from "react";
import { useFloating, offset, flip, shift } from "@floating-ui/react";

export type EditorAction =
  | { tag: "move-up" }
  | { tag: "move-down" }
  | { tag: "delete" }
  | { tag: "edit" }
  | { tag: "more" };

const ACTIONS: readonly { label: string; action: EditorAction }[] = [
  { label: "↑", action: { tag: "move-up" } },
  { label: "↓", action: { tag: "move-down" } },
  { label: "×", action: { tag: "delete" } },
  { label: "✏", action: { tag: "edit" } },
  { label: "⋮", action: { tag: "more" } },
];

const BAR_STYLE: React.CSSProperties = {
  display: "flex",
  gap: "2px",
  padding: "4px",
  background: "white",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  border: "1px solid rgba(0,0,0,0.1)",
  pointerEvents: "auto",
};

const BUTTON_STYLE: React.CSSProperties = {
  width: "28px",
  height: "28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "14px",
};

const MIDDLEWARE = [offset(8), flip(), shift({ padding: 8 })];

export function FloatingActionBar({ rect }: { rect: DOMRect }) {
  const { refs, floatingStyles } = useFloating({
    placement: "top",
    middleware: MIDDLEWARE,
  });

  useEffect(() => {
    refs.setPositionReference({ getBoundingClientRect: () => rect });
  }, [refs, rect]);

  return (
    <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 1 }}>
      <div style={BAR_STYLE}>
        {ACTIONS.map(({ label, action }) => (
          <button
            type="button"
            key={action.tag}
            style={BUTTON_STYLE}
            onClick={() => console.log("editor action", action)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
