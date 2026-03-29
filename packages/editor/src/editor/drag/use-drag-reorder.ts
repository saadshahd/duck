import { useEffect, useRef, useState } from "react";
import type { Spec } from "@json-render/core";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { attachClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { FiberRegistry } from "../fiber/index.js";
import type { EditorEvent, EditorSnapshot } from "../machine/index.js";
import { findParent, collectDescendants } from "../spec-ops/index.js";
import type { DropTarget } from "./drop-indicator.js";
import type { DragData } from "./helpers.js";
import {
  EDGES,
  resolveParentAxis,
  isInContainerZone,
  tagTransitionNames,
  animatedUpdate,
} from "./helpers.js";
import { resolveIndicator } from "./resolve-indicator.js";
import { resolveDrop } from "./resolve-drop.js";

// --- Helpers ---

type Props = {
  registry: FiberRegistry | null;
  spec: Spec;
  state: EditorSnapshot;
  send: (event: EditorEvent) => void;
  onSpecChange?: (spec: Spec) => void;
};

const stateOf = (s: EditorSnapshot) =>
  s.value as { pointer: string; drag: string };

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

  const selectedId = state.context.selectedId;
  const pointer = stateOf(state).pointer;

  // --- Effect 1: Make selected element draggable ---

  useEffect(() => {
    if (!registry || !selectedId || pointer !== "selected") return;

    const ctx = findParent(specRef.current, selectedId);
    if (ctx.isErr()) return;
    const { parentId, childIndex } = ctx.value;

    const sourceEl = registry.get(selectedId);
    if (!sourceEl) return;

    let clearNames: (() => void) | null = null;

    return draggable({
      element: sourceEl,
      getInitialData: () => ({
        elementId: selectedId,
        parentId,
        index: childIndex,
      }),
      onGenerateDragPreview: () => {
        const allChildIds = Object.values(specRef.current.elements).flatMap(
          (el) => el.children ?? [],
        );
        clearNames = tagTransitionNames(registry, allChildIds);
      },
      onDragStart: () => send({ type: "DRAG_START", sourceId: selectedId }),
      onDrop: () => {
        clearNames?.();
        clearNames = null;
      },
    });
  }, [registry, selectedId, pointer, send]);

  // --- Effect 2: Register drop targets on ALL elements ---

  useEffect(() => {
    if (!registry) return;

    const s = specRef.current;
    const containerIds = new Set(
      Object.entries(s.elements)
        .filter(([, el]) => el.children != null)
        .map(([id]) => id),
    );

    const cleanups = Object.keys(s.elements).flatMap((id) => {
      const el = registry.get(id);
      const parent = findParent(s, id);
      if (!el || parent.isErr()) return [];

      const { parentId, childIndex } = parent.value;
      const isContainer = containerIds.has(id);
      const edges =
        EDGES[resolveParentAxis(s, parentId, registry) ?? "vertical"];

      return [
        dropTargetForElements({
          element: el,
          canDrop: ({ source }) => (source.data.elementId as string) !== id,
          getData: ({ input, element }) => {
            if (
              isContainer &&
              isInContainerZone(input, element.getBoundingClientRect())
            )
              return {
                elementId: id,
                role: "container",
              } satisfies Partial<DragData>;
            return attachClosestEdge(
              {
                elementId: id,
                parentId,
                index: childIndex,
                role: "sibling",
              } satisfies DragData,
              { element, input, allowedEdges: edges },
            );
          },
        }),
      ];
    });

    return () => cleanups.forEach((fn) => fn());
  }, [registry, spec]);

  // --- Effect 3: Global drop monitor ---

  useEffect(() => {
    if (!registry) return;

    let descendants: ReadonlySet<string> = new Set();

    const indicator = (
      source: { data: Record<string | symbol, unknown> },
      location: {
        current: {
          dropTargets: readonly { data: Record<string | symbol, unknown> }[];
        };
      },
    ) =>
      setDropTarget(
        resolveIndicator(
          source,
          location.current.dropTargets[0],
          specRef.current,
          registry,
          descendants,
        ),
      );

    return monitorForElements({
      onDragStart: ({ source }) => {
        descendants = collectDescendants(
          specRef.current,
          source.data.elementId as string,
        );
      },
      onDrag: ({ source, location }) => indicator(source, location),
      onDropTargetChange: ({ source, location }) => indicator(source, location),
      onDrop: ({ source, location }) => {
        setDropTarget(null);
        const result = resolveDrop(
          source,
          location.current.dropTargets[0],
          specRef.current,
          registry,
          descendants,
        );
        descendants = new Set();
        if (!result) return send({ type: "DRAG_CANCEL" });
        result.newSpec.map((s) => {
          if (changeRef.current) animatedUpdate(changeRef.current, s);
        });
        send(result.event);
      },
    });
  }, [registry, spec, send]);

  return { dropTarget };
}
