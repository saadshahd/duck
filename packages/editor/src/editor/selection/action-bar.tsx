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
      <div className="action-bar" role="toolbar">
        {ACTIONS.map(({ label, action }) => (
          <button
            type="button"
            key={action.tag}
            onClick={() => console.log("editor action", action)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
