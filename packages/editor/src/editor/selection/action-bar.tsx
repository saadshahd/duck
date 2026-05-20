import { useEffect, type ReactNode, type RefObject } from "react";
import type { Config, Data } from "@puckeditor/core";
import { findById, slotKeysFromConfig } from "@duckeditor/spec";
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
import type { Target } from "../machine/index.js";
import { type Axis, rectOf, ZERO_RECT } from "../layout/index.js";
import css from "./selection.css?inline";

export type EditorAction =
  | { tag: "insert" }
  | { tag: "move-up" }
  | { tag: "move-down" }
  | { tag: "delete" }
  | { tag: "edit" };

const MOVE_LABELS: Record<Axis, { prev: string; next: string }> = {
  vertical: { prev: "↑", next: "↓" },
  horizontal: { prev: "←", next: "→" },
};

const MIDDLEWARE = [offset(8), flip(), shift({ padding: 8 })];

/** Verbs available for a target.
 *  - element: edit, move, delete; insert only when the element has 0 or 1 slots.
 *  - slot: insert only. */
export const actionsFor = (
  target: Target,
  config: Config,
  data: Data,
): { tag: EditorAction["tag"] }[] => {
  if (target.kind === "slot") return [{ tag: "insert" }];
  const type = findById(data, target.elementId)?.type;
  const slotCount = type ? slotKeysFromConfig(config, type).length : 0;
  const verbs: { tag: EditorAction["tag"] }[] = [
    { tag: "move-up" },
    { tag: "move-down" },
    { tag: "delete" },
    { tag: "edit" },
  ];
  if (slotCount <= 1) verbs.push({ tag: "insert" });
  return verbs;
};

export function FloatingActionBar({
  registry,
  data,
  target,
  config,
  axis,
  canMovePrev,
  canMoveNext,
  onAction,
  toolbarRef,
  children,
}: {
  registry: FiberRegistry;
  data: Data;
  target: Target;
  config: Config;
  axis: Axis;
  canMovePrev: boolean;
  canMoveNext: boolean;
  onAction: (action: EditorAction) => void;
  toolbarRef: RefObject<HTMLElement | null>;
  children?: ReactNode;
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
      getBoundingClientRect: () => rectOf(registry, data, target) ?? ZERO_RECT,
    });
  }, [refs, registry, data, target]);

  const labels = MOVE_LABELS[axis];
  const mergedRef = useMergeRefs([refs.setFloating, toolbarRef]);
  const verbs = new Set(actionsFor(target, config, data).map((a) => a.tag));
  const isSlot = target.kind === "slot";
  const slotLabel = isSlot
    ? `${findById(data, target.parentId)?.type ?? ""} › ${target.slotKey}`
    : null;

  return (
    <div ref={mergedRef} style={{ ...floatingStyles, zIndex: 1 }}>
      <div className="action-bar" role="toolbar">
        {slotLabel && (
          <span
            className="slot-action-bar__label"
            data-role="slot-action-bar-label"
          >
            {slotLabel}
          </span>
        )}
        {verbs.has("move-up") && (
          <button
            type="button"
            data-role="action-move-up"
            disabled={!canMovePrev}
            onClick={() => onAction({ tag: "move-up" })}
          >
            {labels.prev}
          </button>
        )}
        {verbs.has("move-down") && (
          <button
            type="button"
            data-role="action-move-down"
            disabled={!canMoveNext}
            onClick={() => onAction({ tag: "move-down" })}
          >
            {labels.next}
          </button>
        )}
        {verbs.has("delete") && (
          <button
            type="button"
            data-role="action-delete"
            onClick={() => onAction({ tag: "delete" })}
          >
            ×
          </button>
        )}
        {verbs.has("edit") && (
          <button
            type="button"
            data-role="action-edit"
            onClick={() => onAction({ tag: "edit" })}
          >
            ✏
          </button>
        )}
        {verbs.has("insert") && (
          <button
            type="button"
            data-role="action-insert"
            onClick={(e) => {
              e.stopPropagation();
              onAction({ tag: "insert" });
            }}
          >
            +
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
