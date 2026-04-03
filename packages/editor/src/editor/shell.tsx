import { useMemo, useRef } from "react";
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
import { editorMachine } from "./machine/index.js";
import {
  useEditorSelection,
  HoverHighlight,
  SelectionRing,
  SelectionLabel,
  FloatingActionBar,
  useActionHandler,
  useMoveInfo,
  createSelectParent,
} from "./selection/index.js";
import { usePropEditor } from "./prop-editor/use-prop-editor.jsx";
import { useDragReorder, DropIndicator, DropZoneLabel } from "./drag/index.js";
import { OverlayRoot } from "./overlay/index.js";
import { BoxModelOverlay, GapOverlay, useBoxModel } from "./box-model/index.js";
import { useHistory, HistoryTimeline } from "./history/index.js";
import { useKeyboard } from "./keyboard/index.js";
import { useGhostPlaceholders } from "./ghost/index.js";
import { useFiberRegistry } from "./shell/use-fiber-registry.js";
import { useContextMenu, ContextMenu } from "./context-menu/index.js";

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

  const elementIds = useMemo(
    () => new Set(Object.keys(currentSpec.elements)),
    [currentSpec],
  );
  const { registry: fiberRegistry, containerRef } = useFiberRegistry(
    elementIds,
    currentSpec,
  );

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

  useKeyboard({
    machine: send,
    history: historySend,
    nav: { spec: currentSpec, selectedId, pointer },
  });

  const selectParent = createSelectParent(currentSpec, selectedId, send);
  const toolbarRef = useRef<HTMLElement | null>(null);

  useGhostPlaceholders(currentSpec, fiberRegistry);
  const {
    menu,
    close: closeMenu,
    highlightId: menuHighlightId,
    setHighlightId: setMenuHighlightId,
  } = useContextMenu(fiberRegistry);

  const hoverHighlightId = !menu && pointer === "hovering" ? hoveredId : null;
  const highlightId = menuHighlightId ?? hoverHighlightId;

  const showBoxModel =
    pointer === "selected" ||
    (pointer === "editing" && state.context.editing?.mode === "popover");
  const boxModel = useBoxModel(fiberRegistry, showBoxModel ? selectedId : null);

  return (
    <StateProvider initialState={{}}>
      <VisibilityProvider>
        <ActionProvider handlers={{}}>
          <div ref={containerRef} style={{ display: "contents" }}>
            <Renderer spec={currentSpec} registry={registry} />
          </div>
        </ActionProvider>
      </VisibilityProvider>

      <style>{`
        body { user-select: none; }
        ::view-transition-group(*) { animation-duration: 200ms; animation-timing-function: ease; }
      `}</style>

      <OverlayRoot>
        {highlightId && fiberRegistry && (
          <HoverHighlight
            registry={fiberRegistry}
            elementId={highlightId}
            elementType={currentSpec.elements[highlightId]?.type}
          />
        )}
        {(pointer === "selected" || pointer === "editing") &&
          fiberRegistry &&
          selectedId && (
            <>
              <SelectionRing registry={fiberRegistry} elementId={selectedId} />
              <SelectionLabel
                registry={fiberRegistry}
                elementId={selectedId}
                elementType={currentSpec.elements[selectedId]?.type}
                toolbarRef={toolbarRef}
                onSelectParent={selectParent}
              />
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
                  toolbarRef={toolbarRef}
                />
              )}
              {pointer === "editing" && popover}
            </>
          )}
        {drag === "dragging" && dropTarget && fiberRegistry && (
          <>
            <DropIndicator registry={fiberRegistry} target={dropTarget} />
            <DropZoneLabel
              registry={fiberRegistry}
              spec={currentSpec}
              target={dropTarget}
            />
          </>
        )}
        {menu && (
          <ContextMenu
            x={menu.x}
            y={menu.y}
            elementIds={menu.elementIds}
            spec={currentSpec}
            send={send}
            onHighlight={setMenuHighlightId}
            onClose={closeMenu}
          />
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
