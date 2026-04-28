import { useMemo, useRef, useState } from "react";
import type { Data, Config } from "@puckeditor/core";
import { buildIndex, findById } from "@duck/spec";
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
import { useClipboard } from "./clipboard/index.js";
import { CatalogPicker, useInsert } from "./insert/index.js";
import { useBridge } from "./bridge/use-bridge.js";
import { RenderHost } from "./duck-render/index.js";
import { ConnectionDot } from "./bridge/connection-dot.js";
import { ReconnectPrompt } from "./bridge/reconnect-prompt.js";
import {
  useMorph,
  MorphButton,
  MorphPicker,
  MorphOverlay,
} from "./morph/index.js";
import type { DataPush } from "./types.js";
import {
  createPatternRegistry,
  type PatternConfig,
} from "@duck/patterns";

type BridgeConfig = { url: string; page: string };

type EditorShellProps = {
  data: Data;
  config: Config;
  onDataChange?: (data: Data) => void;
  bridge?: BridgeConfig;
  patternConfig?: PatternConfig;
};

export function EditorShell({
  data,
  config,
  onDataChange,
  bridge,
  patternConfig,
}: EditorShellProps) {
  const [bridgeUrl, setBridgeUrl] = useState(bridge?.url ?? null);
  const {
    currentData,
    push,
    send: historySend,
    entries,
    currentIndex,
    visibilityState,
    onMouseEnter: timelineMouseEnter,
    onMouseLeave: timelineMouseLeave,
  } = useHistory(data, onDataChange);
  const [state, send] = useMachine(editorMachine);

  const index = useMemo(() => buildIndex(currentData), [currentData]);
  const elementIds = useMemo(() => new Set(index.keys()), [index]);
  const { registry: fiberRegistry, containerRef } = useFiberRegistry(
    elementIds,
    currentData,
  );

  useEditorSelection(fiberRegistry, send);
  const { dropTarget } = useDragReorder({
    registry: fiberRegistry,
    data: currentData,
    index,
    state,
    send,
    push,
  });
  const popover = usePropEditor({
    registry: fiberRegistry,
    data: currentData,
    config,
    state,
    send,
    push,
  });

  const { selectedIds, lastSelectedId } = state.context;
  const singleSelected = selectedIds.size === 1 ? lastSelectedId : null;

  const moveInfo = useMoveInfo(currentData, singleSelected, fiberRegistry);
  const handleAction = useActionHandler({
    data: currentData,
    state,
    send,
    push,
    axis: moveInfo.axis,
  });

  const { pointer, drag } = state.value as {
    pointer: string;
    drag: string;
  };
  const { hoveredId } = state.context;

  const clipboard = useClipboard({
    data: currentData,
    config,
    lastSelectedId,
    push,
    onSelect: (ids) =>
      send(
        ids.length === 1
          ? { type: "SELECT", elementId: ids[0] }
          : { type: "REPLACE_SELECT", elementIds: ids },
      ),
    onDeselect: () => send({ type: "DESELECT" }),
  });

  const { onInsert } = useInsert({
    data: currentData,
    config,
    lastSelectedId,
    send,
    push,
  });

  useKeyboard({
    machine: send,
    history: historySend,
    nav: { data: currentData, lastSelectedId, pointer },
    clipboard,
    onDelete: () => handleAction({ tag: "delete" }),
  });

  const selectParent = createSelectParent(currentData, lastSelectedId, send);
  const toolbarRef = useRef<HTMLElement | null>(null);
  const morphButtonRef = useRef<HTMLButtonElement | null>(null);

  useGhostPlaceholders(currentData, fiberRegistry);
  const {
    menu,
    close: closeMenu,
    highlightId: menuHighlightId,
    setHighlightId: setMenuHighlightId,
  } = useContextMenu(fiberRegistry);

  const hoverHighlightId = !menu && pointer === "hovering" ? hoveredId : null;
  const highlightId = menuHighlightId ?? hoverHighlightId;

  const showBoxModel =
    singleSelected &&
    (pointer === "selected" ||
      pointer === "inserting" ||
      (pointer === "editing" && state.context.editing?.mode === "popover"));
  const boxModel = useBoxModel(
    fiberRegistry,
    showBoxModel ? lastSelectedId : null,
  );

  const hasSelection =
    (pointer === "selected" ||
      pointer === "editing" ||
      pointer === "inserting") &&
    fiberRegistry &&
    selectedIds.size > 0;

  const showActionBar =
    hasSelection && pointer === "selected" && singleSelected;

  const patternRegistry = useMemo(
    () => (patternConfig ? createPatternRegistry(config, patternConfig) : null),
    [config, patternConfig],
  );

  const morph = useMorph({
    registry: patternRegistry,
    selectedId: singleSelected,
    data: currentData,
    push,
  });

  const morphSelectedElement = useMemo(
    () =>
      morph.isOpen && morph.activePattern && singleSelected
        ? findById(currentData, singleSelected)
        : null,
    [morph.isOpen, morph.activePattern, singleSelected, currentData],
  );

  const morphOverlayData = useMemo(() => {
    if (!morphSelectedElement || !patternRegistry || !morph.activePattern)
      return null;
    const result = patternRegistry.apply(
      morphSelectedElement,
      morph.activePattern,
    );
    if (result.isErr()) return null;
    return result.value.data;
  }, [morphSelectedElement, patternRegistry, morph.activePattern]);

  return (
    <>
      <div ref={containerRef} style={{ display: "contents" }}>
        <RenderHost config={config} data={currentData} />
      </div>

      <style>{`
        body { user-select: none; }
        ::view-transition-group(*) { animation-duration: 200ms; animation-timing-function: ease; }
      `}</style>

      {morph.isOpen && morphOverlayData && singleSelected && fiberRegistry && (
        <MorphOverlay
          config={config}
          element={morphOverlayData}
          fiberRegistry={fiberRegistry}
          elementId={singleSelected}
        />
      )}

      <OverlayRoot>
        {highlightId && fiberRegistry && (
          <HoverHighlight
            registry={fiberRegistry}
            elementId={highlightId}
            elementType={index.get(highlightId)?.component.type}
          />
        )}
        {hasSelection && (
          <>
            {[...selectedIds].map((id) => (
              <SelectionRing key={id} registry={fiberRegistry} elementId={id} />
            ))}
            {lastSelectedId && (
              <SelectionLabel
                registry={fiberRegistry}
                elementId={lastSelectedId}
                elementType={index.get(lastSelectedId)?.component.type}
                selectionCount={selectedIds.size}
                toolbarRef={toolbarRef}
                onSelectParent={selectParent}
              />
            )}
            {boxModel && (
              <>
                <BoxModelOverlay data={boxModel} />
                {boxModel.gap && lastSelectedId && (
                  <GapOverlay
                    registry={fiberRegistry!}
                    elementId={lastSelectedId}
                    gap={boxModel.gap}
                  />
                )}
              </>
            )}
            {showActionBar && singleSelected && (
              <FloatingActionBar
                registry={fiberRegistry}
                elementId={singleSelected}
                axis={moveInfo.axis}
                canMovePrev={moveInfo.canMovePrev}
                canMoveNext={moveInfo.canMoveNext}
                canInsert
                onAction={handleAction}
                toolbarRef={toolbarRef}
              >
                {patternRegistry && (
                  <MorphButton
                    count={morph.count}
                    elementId={singleSelected}
                    onClick={morph.openPicker}
                    buttonRef={morphButtonRef}
                  />
                )}
              </FloatingActionBar>
            )}
            {pointer === "editing" && singleSelected && popover}
            {pointer === "inserting" &&
              singleSelected &&
              fiberRegistry &&
              lastSelectedId && (
                <CatalogPicker
                  registry={fiberRegistry}
                  elementId={lastSelectedId}
                  config={config}
                  onInsert={onInsert}
                  onClose={() => send({ type: "ESCAPE" })}
                />
              )}
            {morph.isOpen && singleSelected && (
              <MorphPicker
                patterns={morph.patterns}
                activeIndex={
                  morph.activePattern
                    ? morph.patterns.indexOf(morph.activePattern)
                    : -1
                }
                onHover={(i) =>
                  morph.setActivePattern(i >= 0 ? morph.patterns[i] : null)
                }
                onCommit={(i) => morph.commit(morph.patterns[i])}
                onClose={morph.closePicker}
                commitError={morph.commitError}
                anchorRef={morphButtonRef}
              />
            )}
          </>
        )}
        {drag === "dragging" && dropTarget && fiberRegistry && (
          <>
            <DropIndicator registry={fiberRegistry} target={dropTarget} />
            <DropZoneLabel
              registry={fiberRegistry}
              data={currentData}
              target={dropTarget}
            />
          </>
        )}
        {menu && (
          <ContextMenu
            x={menu.x}
            y={menu.y}
            elementIds={menu.elementIds}
            data={currentData}
            lastSelectedId={lastSelectedId}
            send={send}
            clipboard={clipboard}
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
        {bridgeUrl && bridge && (
          <BridgeConnector
            url={bridgeUrl}
            page={bridge.page}
            selectedId={lastSelectedId}
            currentData={currentData}
            push={push}
            onReconnect={setBridgeUrl}
          />
        )}
      </OverlayRoot>
    </>
  );
}

function BridgeConnector({
  url,
  page,
  selectedId,
  currentData,
  push,
  onReconnect,
}: {
  url: string;
  page: string;
  selectedId: string | null;
  currentData: Data;
  push: DataPush;
  onReconnect: (url: string) => void;
}) {
  const { status } = useBridge({ url, page, selectedId, currentData, push });

  return (
    <>
      <ConnectionDot status={status} />
      <ReconnectPrompt
        status={status}
        currentUrl={url}
        onReconnect={onReconnect}
      />
    </>
  );
}
