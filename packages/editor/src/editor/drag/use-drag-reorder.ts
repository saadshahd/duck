import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Spec } from "@json-render/core";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import type { FiberRegistry } from "../fiber/index.js";
import type { EditorEvent, EditorSnapshot } from "../machine/index.js";
import { findParent, reorderChild, getChildren } from "../spec-ops/index.js";

// --- Types ---

export type Axis = "vertical" | "horizontal";
export type DropTarget = { elementId: string; edge: Edge; axis: Axis };

type Props = {
  registry: FiberRegistry | null;
  spec: Spec;
  state: EditorSnapshot;
  send: (event: EditorEvent) => void;
  onSpecChange?: (spec: Spec) => void;
};

/** Typed shape stored in pragmatic-dnd's untyped userData bag. */
type DragData = { elementId: string; parentId: string; index: number };

/** Single boundary cast — all downstream code is type-safe. */
const readData = (bag: Record<string | symbol, unknown>) => bag as DragData;

// --- Pure helpers ---

const stateOf = (s: EditorSnapshot) =>
  s.value as { pointer: string; drag: string };

/** Drag handlers should be attached whenever an element is selected.
 *  The machine's guards prevent drag start during editing.
 *  Importantly: drag state must NOT be a dep — changing it mid-drag would detach handlers. */
const isSelected = (s: EditorSnapshot) => stateOf(s).pointer === "selected";

const resolveSiblings = (spec: Spec, id: string) =>
  findParent(spec, id).andThen(({ parentId, childIndex }) =>
    getChildren(spec, parentId).map((childIds) => ({
      parentId,
      childIds,
      sourceIndex: childIndex,
    })),
  );

/** Measure geometry of two adjacent siblings to determine layout axis.
 *  Compares actual positions — works for flex, grid, inline-block, any layout. */
const detectAxis = (a: DOMRect, b: DOMRect): Axis => {
  const dy = Math.abs(a.top + a.height / 2 - (b.top + b.height / 2));
  const dx = Math.abs(a.left + a.width / 2 - (b.left + b.width / 2));
  return dy > dx ? "vertical" : "horizontal";
};

const EDGES: Record<Axis, Edge[]> = {
  vertical: ["top", "bottom"],
  horizontal: ["left", "right"],
};

const firstTarget = (
  targets: readonly { data: Record<string | symbol, unknown> }[],
  axis: Axis,
): DropTarget | null => {
  const t = targets[0];
  if (!t) return null;
  const edge = extractClosestEdge(t.data);
  const { elementId } = readData(t.data);
  return edge && elementId ? { elementId, edge, axis } : null;
};

const animatedUpdate = (onChange: (s: Spec) => void, next: Spec) => {
  document.startViewTransition
    ? document.startViewTransition(() => flushSync(() => onChange(next)))
    : onChange(next);
};

const tagTransitionNames = (reg: FiberRegistry, ids: string[]) => {
  const restores = ids.flatMap((id) => {
    const el = reg.get(id);
    if (!el) return [];
    const prev = el.style.viewTransitionName;
    el.style.viewTransitionName = id;
    return [
      () => {
        el.style.viewTransitionName = prev;
      },
    ];
  });
  return () => restores.forEach((fn) => fn());
};

/** Resolve a drop into a reorder destination index. */
const resolveDropIndex = (
  sourceIndex: number,
  target: { data: Record<string | symbol, unknown> },
  axis: Axis,
) => {
  const { index: targetIndex } = readData(target.data);
  return getReorderDestinationIndex({
    startIndex: sourceIndex,
    indexOfTarget: targetIndex,
    closestEdgeOfTarget: extractClosestEdge(target.data),
    axis,
  });
};

// --- Hook ---

export function useDragReorder({
  registry,
  spec,
  state,
  send,
  onSpecChange,
}: Props): { dropTarget: DropTarget | null } {
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const specRef = useRef(spec);
  specRef.current = spec;
  const changeRef = useRef(onSpecChange);
  changeRef.current = onSpecChange;

  const pointer = stateOf(state).pointer;
  const selectedId = state.context.selectedId;

  useEffect(() => {
    if (!registry || !selectedId || !isSelected(state)) return;

    const ctx = resolveSiblings(specRef.current, selectedId);
    if (ctx.isErr() || ctx.value.childIds.length < 2) return;
    const { parentId, childIds, sourceIndex } = ctx.value;

    const sourceEl = registry.get(selectedId);
    if (!sourceEl) return;

    // Detect axis geometrically from first two siblings' positions
    const firstEl = registry.get(childIds[0]);
    const secondEl = registry.get(childIds[1]);
    if (!firstEl || !secondEl) return;
    const axis = detectAxis(
      firstEl.getBoundingClientRect(),
      secondEl.getBoundingClientRect(),
    );
    const edges = EDGES[axis];

    let clearNames: (() => void) | null = null;
    const isSameParent = (bag: Record<string, unknown>) =>
      bag.parentId === parentId;
    const updateIndicator = ({
      location,
    }: {
      location: {
        current: {
          dropTargets: readonly { data: Record<string | symbol, unknown> }[];
        };
      };
    }) => {
      const target = firstTarget(location.current.dropTargets, axis);
      if (!target) return setDropTarget(null);
      // Hide indicator when drop would be a no-op (same position)
      const t = location.current.dropTargets[0];
      const to = t ? resolveDropIndex(sourceIndex, t, axis) : sourceIndex;
      setDropTarget(to === sourceIndex ? null : target);
    };

    const cleanups = [
      draggable({
        element: sourceEl,
        getInitialData: () => ({
          elementId: selectedId,
          parentId,
          index: sourceIndex,
        }),
        onGenerateDragPreview: () => {
          clearNames = tagTransitionNames(registry, childIds);
        },
        onDragStart: () => send({ type: "DRAG_START", sourceId: selectedId }),
        onDrop: () => {
          clearNames?.();
          clearNames = null;
        },
      }),

      ...childIds.flatMap((id, i) => {
        const el = registry.get(id);
        return el
          ? [
              dropTargetForElements({
                element: el,
                canDrop: ({ source }) => isSameParent(source.data),
                getData: ({ input, element }) =>
                  attachClosestEdge(
                    { elementId: id, index: i },
                    { element, input, allowedEdges: edges },
                  ),
              }),
            ]
          : [];
      }),

      monitorForElements({
        canMonitor: ({ source }) => isSameParent(source.data),
        onDrag: updateIndicator,
        onDropTargetChange: updateIndicator,
        onDrop: ({ source, location }) => {
          setDropTarget(null);
          const target = location.current.dropTargets[0];
          if (!target) return send({ type: "DRAG_CANCEL" });

          const from = readData(source.data).index;
          const to = resolveDropIndex(from, target, axis);

          if (from !== to) {
            reorderChild(specRef.current, parentId, from, to).map((newSpec) => {
              if (changeRef.current) animatedUpdate(changeRef.current, newSpec);
            });
          }
          send({ type: "DROP", fromIndex: from, toIndex: to, parentId });
        },
      }),
    ];

    return () => {
      cleanups.forEach((fn) => fn());
      clearNames?.();
    };
  }, [registry, selectedId, pointer, spec, send]);

  return { dropTarget };
}
