import { useEffect } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import type { FiberRegistry } from "../fiber/index.js";

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

const ZERO_RECT: DOMRect = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  toJSON: () => ({}),
};

export function FloatingActionBar({
  registry,
  elementId,
  onAction,
}: {
  registry: FiberRegistry;
  elementId: string;
  onAction: (action: EditorAction) => void;
}) {
  const { refs, floatingStyles } = useFloating({
    placement: "top",
    middleware: MIDDLEWARE,
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useEffect(() => {
    refs.setPositionReference({
      getBoundingClientRect: () => {
        const el = registry.get(elementId);
        return el?.getBoundingClientRect() ?? ZERO_RECT;
      },
    });
  }, [refs, registry, elementId]);

  return (
    <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 1 }}>
      <div className="action-bar" role="toolbar">
        {ACTIONS.map(({ label, action }) => (
          <button
            type="button"
            key={action.tag}
            onClick={() => onAction(action)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
