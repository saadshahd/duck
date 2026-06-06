import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Config, Data, Metadata } from "@puckeditor/core";
import { deepEqual } from "fast-equals";
import {
  buildIndex,
  findById,
  normalizeData,
  type PatternConfig,
} from "@duckeditor/spec";
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
  useToolbarYield,
} from "./selection/index.js";
import { usePropEditor } from "./prop-editor/use-prop-editor.jsx";
import { useDragReorder, DragOverlay } from "./drag/index.js";
import { useCarry } from "./carry/index.js";
import { OverlayRoot } from "./overlay/index.js";
import { BoxModelLayer } from "./box-model/index.js";
import { useHistory, HistoryTimeline } from "./history/index.js";
import { useKeyboard } from "./keyboard/index.js";
import { useGhostPlaceholders } from "./ghost/index.js";
import { useFiberRegistry } from "./shell/use-fiber-registry.js";
import { useSelectionReconcile } from "./shell/use-selection-reconcile.js";
import { useContextMenu, ContextMenu } from "./context-menu/index.js";
import { useClipboard } from "./clipboard/index.js";
import { CatalogPicker, useInsert } from "./insert/index.js";
import { RenderHost } from "./duck-render/index.js";
import {
  useMorph,
  MorphButton,
  MorphPicker,
  MorphOverlay,
  usePatterns,
} from "./morph/index.js";
import { useResolution } from "./resolve/use-resolution.js";
import { ShimmerOverlay } from "./resolve/shimmer-overlay.js";
import { useEditorCommit } from "./commit.js";
import type { EditorCommit } from "./types.js";

export type EditorProps<UserConfig extends Config = Config> = {
  data: Partial<Data>;
  config: UserConfig;
  onChange?: (data: Data) => void;
  metadata?: Metadata;
  patternConfig?: PatternConfig;
  children?: ReactNode;
};

export type EditorInternals = {
  currentData: Data;
  lastSelectedId: string | null;
  commit: EditorCommit;
};

const EditorInternalsContext = createContext<EditorInternals | null>(null);

export function useEditorInternals(): EditorInternals {
  const ctx = useContext(EditorInternalsContext);

  if (!ctx) {
    throw new Error(
      "useEditorInternals must be used within <Editor>'s children",
    );
  }

  return ctx;
}

export function Editor<UserConfig extends Config = Config>({
  data,
  config,
  onChange,
  metadata,
  patternConfig,
  children,
}: EditorProps<UserConfig>) {
  const initialData = useMemo(() => normalizeData(data), [data]);
  const history = useHistory(initialData, onChange);
  const {
    currentData,
    push,
    reset,
    send: historySend,
    entries,
    currentIndex,
    visibilityState,
    onMouseEnter: timelineMouseEnter,
    onMouseLeave: timelineMouseLeave,
  } = history;
  const resolvedMetadata = useMemo(() => metadata ?? {}, [metadata]);
  const { emitOp, resolvingIds, errorIds } = useResolution({
    config,
    metadata: resolvedMetadata,
    history,
  });
  const commit = useEditorCommit({ push, emitOp });
  const lastSeenPropRef = useRef(data);

  useEffect(() => {
    if (data === lastSeenPropRef.current) return;
    const next = normalizeData(data);
    lastSeenPropRef.current = data;
    if (deepEqual(next, currentData)) return;
    reset(next);
  }, [data, currentData, reset]);

  const [state, send] = useMachine(editorMachine);

  const index = useMemo(() => buildIndex(currentData), [currentData]);
  const elementIds = useMemo(() => new Set(index.keys()), [index]);
  const { registry: fiberRegistry, containerRef } = useFiberRegistry(
    elementIds,
    currentData,
  );

  useSelectionReconcile(state.context, elementIds, send);
  useEditorSelection(fiberRegistry, send);
  const { dropTarget } = useDragReorder({
    registry: fiberRegistry,
    data: currentData,
    index,
    state,
    send,
    commit,
  });
  const { target: carryTarget } = useCarry({
    registry: fiberRegistry,
    data: currentData,
    state,
    send,
    commit,
  });
  const popover = usePropEditor({
    registry: fiberRegistry,
    data: currentData,
    config,
    metadata,
    state,
    send,
    commit,
  });

  const { selectedIds, lastSelectedId } = state.context;
  const singleSelected = selectedIds.size === 1 ? lastSelectedId : null;

  const moveInfo = useMoveInfo(currentData, singleSelected, fiberRegistry);
  const handleAction = useActionHandler({
    data: currentData,
    state,
    send,
    commit,
    axis: moveInfo.axis,
  });

  const { pointer, drag } = state.value as {
    pointer: string;
    drag: string;
  };
  const { hoveredId } = state.context;

  const clipboard = useClipboard({
    data: currentData,
    config: config,
    lastSelectedId,
    commit,
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
    config: config,
    lastSelectedId,
    send,
    commit,
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

  const [boxModelVisible, setBoxModelVisible] = useState(false);

  const hasSelection =
    (pointer === "selected" ||
      pointer === "editing" ||
      pointer === "inserting") &&
    fiberRegistry &&
    selectedIds.size > 0;

  const yieldingToolbar = useToolbarYield(fiberRegistry, singleSelected);

  const showActionBar =
    hasSelection &&
    pointer === "selected" &&
    singleSelected &&
    drag === "idle" &&
    !yieldingToolbar;

  const { registry: patternRegistry, remintIds } = usePatterns(
    config,
    patternConfig,
  );

  const morph = useMorph({
    registry: patternRegistry,
    remintIds,
    selectedId: singleSelected,
    data: currentData,
    commit,
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

  const onMorphHover = useCallback(
    (i: number) => morph.setActivePattern(i >= 0 ? morph.patterns[i] : null),
    [morph.setActivePattern, morph.patterns],
  );
  const onMorphCommit = useCallback(
    (i: number) => morph.commit(morph.patterns[i]),
    [morph.commit, morph.patterns],
  );

  const internals = useMemo<EditorInternals>(
    () => ({ currentData, lastSelectedId, commit }),
    [currentData, lastSelectedId, commit],
  );

  return (
    <EditorInternalsContext.Provider value={internals}>
      <div ref={containerRef} style={{ display: "contents" }}>
        <RenderHost config={config} data={currentData} metadata={metadata} />
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
          metadata={metadata}
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
        <ShimmerOverlay
          registry={fiberRegistry}
          resolvingIds={resolvingIds}
          errorIds={errorIds}
        />
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
              >
                <button
                  type="button"
                  className={`label-action-btn${boxModelVisible ? " label-action-btn--active" : ""}`}
                  onClick={() => setBoxModelVisible((v) => !v)}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  >
                    <rect x="0.6" y="0.6" width="8.8" height="8.8" rx="0.8" />
                    <rect x="3" y="3" width="4" height="4" />
                  </svg>
                </button>
              </SelectionLabel>
            )}
            {boxModelVisible &&
              fiberRegistry &&
              [...selectedIds].map((id) => (
                <BoxModelLayer
                  key={id}
                  registry={fiberRegistry}
                  elementId={id}
                />
              ))}
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
                onHover={onMorphHover}
                onCommit={onMorphCommit}
                onClose={morph.closePicker}
                commitError={morph.commitError}
                anchorRef={morphButtonRef}
              />
            )}
          </>
        )}
        {(() => {
          const target =
            drag === "dragging"
              ? dropTarget
              : drag === "carrying"
                ? carryTarget
                : null;
          return target && fiberRegistry ? (
            <DragOverlay
              registry={fiberRegistry}
              data={currentData}
              target={target}
            />
          ) : null;
        })()}
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
        {children}
      </OverlayRoot>
    </EditorInternalsContext.Provider>
  );
}
