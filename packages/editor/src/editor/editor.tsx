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
  type DuckMeta,
  type PatternConfig,
} from "@duckeditor/spec";
import { useMachine } from "@xstate/react";
import { editorMachine, Target } from "./machine/index.js";
import {
  useEditorSelection,
  HoverHighlight,
  SelectionRing,
  SelectionLabel,
  FloatingActionBar,
  useActionHandler,
  useMoveInfo,
  createSelectParent,
  targetLabel,
} from "./selection/index.js";
import { usePropEditor } from "./prop-editor/use-prop-editor.jsx";
import { useDragReorder, DropIndicator, DropZoneLabel } from "./drag/index.js";
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
  meta?: DuckMeta;
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
  meta,
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

  useSelectionReconcile(state.context.selection, elementIds, send);
  useEditorSelection(fiberRegistry, send);
  const { dropTarget } = useDragReorder({
    registry: fiberRegistry,
    data: currentData,
    index,
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

  const { selection } = state.context;
  const selectedElementId = Target.elementId(selection);

  const moveInfo = useMoveInfo(currentData, selectedElementId, fiberRegistry);
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
  const { hovered } = state.context;

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
    selection,
    send,
    commit,
  });

  useKeyboard({
    machine: send,
    history: historySend,
    nav: {
      data: currentData,
      selection,
      pointer,
    },
    clipboard,
    onDelete: () => handleAction({ tag: "delete" }),
  });

  const selectParent = createSelectParent(currentData, selectedElementId, send);
  const toolbarRef = useRef<HTMLElement | null>(null);
  const morphButtonRef = useRef<HTMLButtonElement | null>(null);

  useGhostPlaceholders(currentData, fiberRegistry);
  const {
    menu,
    close: closeMenu,
    highlightId: menuHighlightId,
    setHighlightId: setMenuHighlightId,
  } = useContextMenu(fiberRegistry);

  const hoverTarget =
    !menu && pointer === "hovering" && hovered
      ? hovered
      : menuHighlightId
        ? Target.element(menuHighlightId)
        : null;
  const hoverLabel = targetLabel(hoverTarget, index);

  const [boxModelVisible, setBoxModelVisible] = useState(false);

  const isInteractingWithSelection =
    pointer === "selected" || pointer === "editing" || pointer === "inserting";
  const hasSelection =
    isInteractingWithSelection && fiberRegistry !== null && selection !== null;

  const showActionBar = hasSelection && pointer === "selected";

  const { registry: patternRegistry, remintIds } = usePatterns(
    config,
    patternConfig,
  );

  const morph = useMorph({
    registry: patternRegistry,
    remintIds,
    selectedId: selectedElementId,
    data: currentData,
    commit,
  });

  const morphSelectedElement = useMemo(
    () =>
      morph.isOpen && morph.activePattern && selectedElementId
        ? findById(currentData, selectedElementId)
        : null,
    [morph.isOpen, morph.activePattern, selectedElementId, currentData],
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

  const insertAnchorId = Target.anchorId(selection);

  return (
    <EditorInternalsContext.Provider value={internals}>
      <div ref={containerRef} style={{ display: "contents" }}>
        <RenderHost
          config={config}
          data={currentData}
          metadata={metadata}
          meta={meta}
        />
      </div>

      <style>{`
        body { user-select: none; }
        ::view-transition-group(*) { animation-duration: 200ms; animation-timing-function: ease; }
      `}</style>

      {morph.isOpen &&
        morphOverlayData &&
        selectedElementId &&
        fiberRegistry && (
          <MorphOverlay
            config={config}
            element={morphOverlayData}
            fiberRegistry={fiberRegistry}
            elementId={selectedElementId}
            metadata={metadata}
          />
        )}
        <ShimmerOverlay
          registry={fiberRegistry}
          resolvingIds={resolvingIds}
          errorIds={errorIds}
        />
        {hasSelection && (
          <>
            <SelectionRing
              registry={fiberRegistry}
              data={currentData}
              target={selection}
            />
            {selectedElementId && (
              <SelectionLabel
                registry={fiberRegistry}
                elementId={selectedElementId}
                elementType={index.get(selectedElementId)?.component.type}
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
            {boxModelVisible && fiberRegistry && selectedElementId && (
              <BoxModelLayer
                registry={fiberRegistry}
                elementId={selectedElementId}
              />
            )}
            {showActionBar && (
              <FloatingActionBar
                registry={fiberRegistry}
                data={currentData}
                target={selection}
                config={config}
                axis={moveInfo.axis}
                canMovePrev={moveInfo.canMovePrev}
                canMoveNext={moveInfo.canMoveNext}
                onAction={handleAction}
                toolbarRef={toolbarRef}
              >
                {patternRegistry && selectedElementId && (
                  <MorphButton
                    count={morph.count}
                    elementId={selectedElementId}
                    onClick={morph.openPicker}
                    buttonRef={morphButtonRef}
                  />
                )}
              </FloatingActionBar>
            )}
            {pointer === "editing" && selectedElementId && popover}
            {pointer === "inserting" && fiberRegistry && insertAnchorId && (
              <CatalogPicker
                registry={fiberRegistry}
                elementId={insertAnchorId}
                config={config}
                onInsert={onInsert}
                onClose={() => send({ type: "ESCAPE" })}
              />
            )}
            {morph.isOpen && selectedElementId && (
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
            selectedElementId={selectedElementId}
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
