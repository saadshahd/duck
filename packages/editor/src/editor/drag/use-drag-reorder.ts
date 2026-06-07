import { useEffect, useRef, useState } from "react";
import type { Data } from "@puckeditor/core";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { disableNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview";
import { attachClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import {
  buildIndex,
  collectDescendants,
  findParent,
  slotKeysOf,
} from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import type { EditorEvent, EditorSnapshot } from "../machine/index.js";
import type { DropTarget } from "../layout/index.js";
import type { DragData } from "./helpers.js";
import { EDGES, resolveSlotAxis, tagTransitionNames } from "./helpers.js";
import {
  destinationStack,
  Cycle,
  sameStatus,
  type CycleState,
  type CycleStatus,
} from "../layout/index.js";
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

type Point = { x: number; y: number };

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
  cycleStatus: CycleStatus | null;
  sourceType: string | null;
  point: Point | null;
} {
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const dropTargetRef = useRef<DropTarget | null>(null);
  const [cycleStatus, setCycleStatus] = useState<CycleStatus | null>(null);
  const [sourceType, setSourceType] = useState<string | null>(null);
  const [point, setPoint] = useState<Point | null>(null);

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

  // Transient drag state — refs, never deps, so handlers stay attached mid-drag.
  const cycleRef = useRef<CycleState>(Cycle.idle);
  const prevShiftRef = useRef(false);

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
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        const allIds = [...indexRef.current.keys()];
        clearNames = tagTransitionNames(registry, allIds);
        // No native preview snapshot — a static image cannot live-update the
        // resolved destination. The overlay MoveGhost follows the pointer and
        // re-resolves instead.
        disableNativeDragPreview({ nativeSetDragImage });
      },
      onDragStart: () => {
        setSourceType(
          indexRef.current.get(lastSelectedId)?.component.type ?? null,
        );
        send({ type: "DRAG_START", sourceId: lastSelectedId });
      },
      onDrop: () => {
        clearNames?.();
        clearNames = null;
        setSourceType(null);
        setPoint(null);
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
            if (isContainer)
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
    let detachShift: (() => void) | null = null;

    type Source = { data: Record<string | symbol, unknown> };
    type Location = {
      current: {
        dropTargets: readonly { data: Record<string | symbol, unknown> }[];
        input: { clientX: number; clientY: number; shiftKey: boolean };
      };
    };

    // Stack of reachable destinations under the pointer, excluding the dragged
    // subtree. The rising shift edge steps the cycle over it; pointer drift
    // within the same deepest container holds, a new container resets.
    const driveCycle = (
      source: Source,
      point: { x: number; y: number },
      shiftKey: boolean,
    ) => {
      const stack = destinationStack({
        point,
        data: dataRef.current,
        registry,
        excludeId: source.data.elementId as string,
      });
      if (shiftKey && !prevShiftRef.current)
        cycleRef.current = Cycle.step(cycleRef.current, stack);
      prevShiftRef.current = shiftKey;
      cycleRef.current = Cycle.syncPointer(cycleRef.current, stack);
      const picked = Cycle.selected(cycleRef.current, stack);

      // Update cycle counter UI state. This runs per pointer move; the
      // functional updater returns the previous reference when unchanged so
      // React bails out of the re-render.
      const next =
        cycleRef.current.active && stack.length > 0
          ? { step: cycleRef.current.index + 1, total: stack.length }
          : null;
      setCycleStatus((prev) => (sameStatus(prev, next) ? prev : next));

      return picked;
    };

    // Pragmatic path: cycle override wins, else pointer resolution.
    const updateFromLocation = (source: Source, location: Location) => {
      const point = {
        x: location.current.input.clientX,
        y: location.current.input.clientY,
      };
      setPoint(point);
      const picked = driveCycle(source, point, location.current.input.shiftKey);
      if (picked)
        return updateDropTarget(
          Cycle.toTarget(picked, dataRef.current, registry),
        );
      updateDropTarget(
        resolveIndicator({
          source,
          target: location.current.dropTargets[0],
          point,
          previous: dropTargetRef.current,
          data: dataRef.current,
          registry,
          descendantSet: descendants,
        }),
      );
    };

    const stopMonitor = monitorForElements({
      onDragStart: ({ source }) => {
        descendants = new Set(
          collectDescendants(dataRef.current, source.data.elementId as string),
        );
        cycleRef.current = Cycle.idle;
        prevShiftRef.current = false;
        setCycleStatus(null);
        // Native fallback: spec dragover fires on modifier-only changes that
        // pragmatic may swallow when coordinates don't move (~350ms cadence).
        // It only drives the cycle — pointer resolution stays with pragmatic.
        const onDragOver = (e: DragEvent) => {
          const picked = driveCycle(
            source,
            { x: e.clientX, y: e.clientY },
            e.shiftKey,
          );
          if (picked)
            updateDropTarget(Cycle.toTarget(picked, dataRef.current, registry));
        };
        document.addEventListener("dragover", onDragOver);
        detachShift = () =>
          document.removeEventListener("dragover", onDragOver);
      },
      onDrag: ({ source, location }) => updateFromLocation(source, location),
      onDropTargetChange: ({ source, location }) =>
        updateFromLocation(source, location),
      onDrop: ({ source, location }) => {
        detachShift?.();
        detachShift = null;
        cycleRef.current = Cycle.idle;
        prevShiftRef.current = false;
        setCycleStatus(null);
        setSourceType(null);
        setPoint(null);
        const lastIndicator = dropTargetRef.current;
        updateDropTarget(null);
        const beforeData = dataRef.current;
        const result = resolveDrop({
          source,
          target: location.current.dropTargets[0],
          indicator: lastIndicator,
          data: beforeData,
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

    return () => {
      detachShift?.();
      stopMonitor();
    };
  }, [registry, data, send]);

  return { dropTarget, cycleStatus, sourceType, point };
}
