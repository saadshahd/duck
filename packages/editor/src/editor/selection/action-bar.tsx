import { useEffect, type RefObject } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  useMergeRefs,
} from "@floating-ui/react";
import { useShadowSheet } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import type { Axis } from "../layout/index.js";
import css from "./selection.css?inline";

export type EditorAction =
  | { tag: "insert" }
  | { tag: "move-up" }
  | { tag: "move-down" }
  | { tag: "delete" }
  | { tag: "edit" }
  | { tag: "more" };

const MOVE_LABELS: Record<Axis, { prev: string; next: string }> = {
  vertical: { prev: "↑", next: "↓" },
  horizontal: { prev: "←", next: "→" },
};

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
  axis,
  canMovePrev,
  canMoveNext,
  canInsert,
  onAction,
  toolbarRef,
}: {
  registry: FiberRegistry;
  elementId: string;
  axis: Axis;
  canMovePrev: boolean;
  canMoveNext: boolean;
  canInsert: boolean;
  onAction: (action: EditorAction) => void;
  toolbarRef: RefObject<HTMLElement | null>;
}) {
  useShadowSheet(css);
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

  const labels = MOVE_LABELS[axis];
  const mergedRef = useMergeRefs([refs.setFloating, toolbarRef]);

  return (
    <div ref={mergedRef} style={{ ...floatingStyles, zIndex: 1 }}>
      <div className="action-bar" role="toolbar">
        {canInsert && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction({ tag: "insert" });
            }}
          >
            +
          </button>
        )}
        <button
          type="button"
          disabled={!canMovePrev}
          onClick={() => onAction({ tag: "move-up" })}
        >
          {labels.prev}
        </button>
        <button
          type="button"
          disabled={!canMoveNext}
          onClick={() => onAction({ tag: "move-down" })}
        >
          {labels.next}
        </button>
        <button type="button" onClick={() => onAction({ tag: "delete" })}>
          ×
        </button>
        <button type="button" onClick={() => onAction({ tag: "edit" })}>
          ✏
        </button>
        <button type="button" onClick={() => onAction({ tag: "more" })}>
          ⋮
        </button>
      </div>
    </div>
  );
}
