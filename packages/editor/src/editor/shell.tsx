import { useEffect, useRef, useState, useMemo } from "react";
import type { Spec } from "@json-render/core";
import type { ZodTypeAny } from "zod";
import {
  Renderer,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
} from "@json-render/react";
import type { ComponentRegistry } from "@json-render/react";
import { useMachine } from "@xstate/react";
import { createFiberRegistry, type FiberRegistry } from "./fiber/index.js";
import { editorMachine } from "./machine/index.js";
import {
  useEditorSelection,
  HoverHighlight,
  SelectionRing,
  FloatingActionBar,
  useActionHandler,
  useMoveInfo,
} from "./selection/index.js";
import { usePropEditor } from "./prop-editor/use-prop-editor.jsx";
import { useDragReorder, DropIndicator } from "./drag/index.js";
import { OverlayRoot } from "./overlay/index.js";
import { BoxModelOverlay, GapOverlay, useBoxModel } from "./box-model/index.js";
import { useHistory, HistoryTimeline } from "./history/index.js";
import { useKeyboard } from "./keyboard/index.js";
import { useGhostPlaceholders } from "./ghost/index.js";

function useFiberRegistry(
  elementIds: ReadonlySet<string>,
): FiberRegistry | null {
  const idsRef = useRef(elementIds);
  idsRef.current = elementIds;
  const [registry, setRegistry] = useState<FiberRegistry | null>(null);

  useEffect(function initFiberRegistry() {
    const reg = createFiberRegistry(() => idsRef.current);
    setRegistry(reg);
    return () => reg.dispose();
  }, []);

  return registry;
}

type EditorShellProps = {
  spec: Spec;
  registry: ComponentRegistry;
  onSpecChange?: (spec: Spec) => void;
  getPropSchema?: (componentType: string) => ZodTypeAny | undefined;
};

export function EditorShell({
  spec,
  registry,
  onSpecChange,
  getPropSchema,
}: EditorShellProps) {
  const {
    currentSpec,
    push,
    send: historySend,
    entries,
    currentIndex,
    visibilityState,
    onMouseEnter: timelineMouseEnter,
    onMouseLeave: timelineMouseLeave,
  } = useHistory(spec, onSpecChange);
  const [state, send] = useMachine(editorMachine);
  useKeyboard({ machine: send, history: historySend });

  const elementIds = useMemo(
    () => new Set(Object.keys(currentSpec.elements)),
    [currentSpec],
  );
  const fiberRegistry = useFiberRegistry(elementIds);

  useEditorSelection(fiberRegistry, send);
  const { dropTarget } = useDragReorder({
    registry: fiberRegistry,
    spec: currentSpec,
    state,
    send,
    push,
  });
  const popover = usePropEditor({
    registry: fiberRegistry,
    spec: currentSpec,
    state,
    send,
    push,
    getPropSchema,
  });
  const moveInfo = useMoveInfo(
    currentSpec,
    state.context.selectedId,
    fiberRegistry,
  );
  const handleAction = useActionHandler({
    spec: currentSpec,
    state,
    send,
    push,
    axis: moveInfo.axis,
  });

  const { pointer, drag } = state.value as {
    pointer: string;
    drag: string;
  };
  const { hoveredId, selectedId } = state.context;

  useGhostPlaceholders(currentSpec, fiberRegistry);

  const showBoxModel =
    pointer === "selected" ||
    (pointer === "editing" && state.context.editing?.mode === "popover");
  const boxModel = useBoxModel(fiberRegistry, showBoxModel ? selectedId : null);

  return (
    <StateProvider initialState={{}}>
      <VisibilityProvider>
        <ActionProvider handlers={{}}>
          <Renderer spec={currentSpec} registry={registry} />
        </ActionProvider>
      </VisibilityProvider>

      <style>{`
        body { user-select: none; }
        ::view-transition-group(*) { animation-duration: 200ms; animation-timing-function: ease; }
      `}</style>

      <OverlayRoot>
        {pointer === "hovering" && fiberRegistry && hoveredId && (
          <HoverHighlight registry={fiberRegistry} elementId={hoveredId} />
        )}
        {(pointer === "selected" || pointer === "editing") &&
          fiberRegistry &&
          selectedId && (
            <>
              <SelectionRing registry={fiberRegistry} elementId={selectedId} />
              {boxModel && (
                <>
                  <BoxModelOverlay data={boxModel} />
                  {boxModel.gap && (
                    <GapOverlay
                      registry={fiberRegistry!}
                      elementId={selectedId}
                      gap={boxModel.gap}
                    />
                  )}
                </>
              )}
              {pointer === "selected" && (
                <FloatingActionBar
                  registry={fiberRegistry}
                  elementId={selectedId}
                  axis={moveInfo.axis}
                  canMovePrev={moveInfo.canMovePrev}
                  canMoveNext={moveInfo.canMoveNext}
                  onAction={handleAction}
                />
              )}
              {pointer === "editing" && popover}
            </>
          )}
        {drag === "dragging" && dropTarget && fiberRegistry && (
          <DropIndicator registry={fiberRegistry} target={dropTarget} />
        )}
        <HistoryTimeline
          entries={entries}
          currentIndex={currentIndex}
          visibilityState={visibilityState}
          onRestore={(idx) => historySend({ type: "RESTORE", index: idx })}
          onRename={(idx, name) =>
            historySend({ type: "RENAME", index: idx, name })
          }
          onMouseEnter={timelineMouseEnter}
          onMouseLeave={timelineMouseLeave}
        />
      </OverlayRoot>
    </StateProvider>
  );
}
