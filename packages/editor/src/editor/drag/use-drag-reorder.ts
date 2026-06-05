import { useEffect, useRef, useState } from "react";
import type { Data } from "@puckeditor/core";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { attachClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import {
  buildIndex,
  collectDescendants,
  findParent,
  slotKeysOf,
} from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import type { EditorEvent, EditorSnapshot } from "../machine/index.js";
import type { DropTarget } from "./drop-indicator.js";
import type { DragData } from "./helpers.js";
import {
  EDGES,
  resolveSlotAxis,
  isInContainerZone,
  tagTransitionNames,
} from "./helpers.js";
import { animatedUpdate } from "../animated-update.js";
import type { EditorCommit } from "../types.js";
import { resolveIndicator } from "./resolve-indicator.js";
import { resolveDrop } from "./resolve-drop.js";

// --- Helpers ---

type Props = {
  registry: FiberRegistry | null;
  data: Data;
  index: ReturnType<typeof buildIndex>;
  state: EditorSnapshot;
  send: (event: EditorEvent) => void;
  commit: EditorCommit;
};

const stateOf = (s: EditorSnapshot) =>
  s.value as { pointer: string; drag: string };

// --- Hook ---

export function useDragReorder({
  registry,
  data,
  index,
  state,
  send,
  commit,
}: Props): {
  dropTarget: DropTarget | null;
} {
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const dropTargetRef = useRef<DropTarget | null>(null);
  const updateDropTarget = (target: DropTarget | null) => {
    dropTargetRef.current = target;
    setDropTarget(target);
  };
  const dataRef = useRef(data);
  dataRef.current = data;
  const indexRef = useRef(index);
  indexRef.current = index;
  const commitRef = useRef(commit);
  commitRef.current = commit;

  const { lastSelectedId, selectedIds } = state.context;
  const pointer = stateOf(state).pointer;
  const singleSelected = selectedIds.size === 1;

  // --- Effect 1: Make selected element draggable (single selection only) ---

  useEffect(() => {
    if (
      !registry ||
      !lastSelectedId ||
      !singleSelected ||
      pointer !== "selected"
    )
      return;

    const parent = findParent(dataRef.current, lastSelectedId);
    if (!parent) return;

    const sourceEl = registry.get(lastSelectedId);
    if (!sourceEl) return;

    let clearNames: (() => void) | null = null;

    return draggable({
      element: sourceEl,
      getInitialData: (): DragData => ({
        elementId: lastSelectedId,
        parentId: parent.parentId,
        slotKey: parent.slotKey,
        index: parent.index,
        role: "sibling",
      }),
      onGenerateDragPreview: () => {
        const allIds = [...indexRef.current.keys()];
        clearNames = tagTransitionNames(registry, allIds);
      },
      onDragStart: () => send({ type: "DRAG_START", sourceId: lastSelectedId }),
      onDrop: () => {
        clearNames?.();
        clearNames = null;
      },
    });
  }, [registry, lastSelectedId, singleSelected, pointer, send]);

  // --- Effect 2: Register drop targets on every component ---

  useEffect(() => {
    if (!registry) return;

    const cleanups: (() => void)[] = [];

    for (const [id, { component, path }] of index) {
      const el = registry.get(id);
      const parent = path.at(-1);
      if (!el || !parent) continue;

      const slots = slotKeysOf(component);
      const isContainer = slots.length > 0;
      const edges =
        EDGES[
          resolveSlotAxis(
            dataRef.current,
            parent.parentId,
            parent.slotKey,
            registry,
          ) ?? "vertical"
        ];

      cleanups.push(
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
                parentId: parent.parentId,
                slotKey: parent.slotKey,
                index: parent.index,
                role: "container",
              } satisfies DragData;
            return attachClosestEdge(
              {
                elementId: id,
                parentId: parent.parentId,
                slotKey: parent.slotKey,
                index: parent.index,
                role: "sibling",
              } satisfies DragData,
              { element, input, allowedEdges: edges },
            );
          },
        }),
      );
    }

    return () => cleanups.forEach((fn) => fn());
  }, [registry, data, index]);

  // --- Effect 3: Global drop monitor ---

  useEffect(() => {
    if (!registry) return;

    let descendants: ReadonlySet<string> = new Set();

    const updateIndicator = (
      source: { data: Record<string | symbol, unknown> },
      location: {
        current: {
          dropTargets: readonly { data: Record<string | symbol, unknown> }[];
          input: { clientX: number; clientY: number };
        };
      },
    ) =>
      updateDropTarget(
        resolveIndicator({
          source,
          target: location.current.dropTargets[0],
          point: {
            x: location.current.input.clientX,
            y: location.current.input.clientY,
          },
          previous: dropTargetRef.current,
          data: dataRef.current,
          registry,
          descendantSet: descendants,
        }),
      );

    return monitorForElements({
      onDragStart: ({ source }) => {
        descendants = new Set(
          collectDescendants(dataRef.current, source.data.elementId as string),
        );
      },
      onDrag: ({ source, location }) => updateIndicator(source, location),
      onDropTargetChange: ({ source, location }) =>
        updateIndicator(source, location),
      onDrop: ({ source, location }) => {
        const lastIndicator = dropTargetRef.current;
        updateDropTarget(null);
        const beforeData = dataRef.current;
        const result = resolveDrop({
          source,
          target: location.current.dropTargets[0],
          indicator: lastIndicator,
          data: beforeData,
          registry,
          descendantSet: descendants,
        });
        descendants = new Set();
        if (!result) return send({ type: "DRAG_CANCEL" });
        result.newData.map((d) => {
          animatedUpdate((next) => {
            commitRef.current({
              beforeData,
              afterData: next,
              label: "Reordered element",
              resolve: { kind: "move", id: source.data.elementId as string },
            });
          }, d);
        });
        send(result.event);
      },
    });
  }, [registry, data, send]);

  return { dropTarget };
}
