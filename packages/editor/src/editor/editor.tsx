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
  SelectionCluster,
  SlotStop,
  FloatingActionBar,
  useActionHandler,
  useMoveInfo,
  createSelectParent,
  useToolbarYield,
} from "./selection/index.js";
import { usePropEditor } from "./prop-editor/use-prop-editor.jsx";
import { useDragReorder, DragOverlay, CycleChip } from "./drag/index.js";
import { useCarry, LiftPulse, NoTargetFlash } from "./carry/index.js";
import { OverlayRoot, Announcer } from "./overlay/index.js";
import { BoxModelLayer } from "./box-model/index.js";
import { useHistory, HistoryTimeline } from "./history/index.js";
import { useKeyboard } from "./keyboard/index.js";
import { useGhostPlaceholders } from "./ghost/index.js";
import { useFiberRegistry } from "./shell/use-fiber-registry.js";
import { useSelectionReconcile } from "./shell/use-selection-reconcile.js";
import { useSlotAddress } from "./shell/use-slot-stop.js";
import { interactionState, affordancesFor } from "./shell/affordances.js";
import {
  announcerMessage,
  assertiveCarryMessage,
} from "./shell/announcer-message.js";
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
  const { dropTarget, cycleStatus } = useDragReorder({
    registry: fiberRegistry,
    data: currentData,
    index,
    state,
    send,
    commit,
  });
  const { target: carryTarget, noTargetFlash } = useCarry({
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
  const dragSourceId = state.context.dragSourceId;

  // Capture a snapshot rect at the moment carry starts for the lift pulse.
  const liftRectRef = useRef<DOMRect | null>(null);
  const prevDragRef = useRef(drag);
  if (
    drag === "carrying" &&
    prevDragRef.current !== "carrying" &&
    dragSourceId &&
    fiberRegistry
  ) {
    liftRectRef.current =
      fiberRegistry.get(dragSourceId)?.getBoundingClientRect() ?? null;
  }
  if (drag !== "carrying") liftRectRef.current = null;
  prevDragRef.current = drag;
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

  const selectParent = createSelectParent({
    data: currentData,
    lastSelectedId,
    pointer,
    selectedSlot: state.context.selectedSlot,
    send,
  });
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

  const { selectedSlot } = state.context;
  const slotAddress = useSlotAddress(currentData, lastSelectedId);

  const affordances = affordancesFor(
    interactionState({
      pointer,
      drag,
      hasSelection: selectedIds.size > 0,
      hasSlot: selectedSlot !== null,
    }),
  );

  const yieldingToolbar = useToolbarYield(fiberRegistry, singleSelected);

  const showActionBar =
    affordances.actionBar && singleSelected && !yieldingToolbar;

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
        {affordances.selectionRings &&
          fiberRegistry &&
          [...selectedIds].map((id) => (
            <SelectionRing key={id} registry={fiberRegistry} elementId={id} />
          ))}
        {affordances.labelCluster && fiberRegistry && lastSelectedId && (
          <SelectionCluster
            registry={fiberRegistry}
            elementId={lastSelectedId}
            elementType={index.get(lastSelectedId)?.component.type}
            selectionCount={selectedIds.size}
            slotAddress={slotAddress}
            toolbarRef={toolbarRef}
            onSelectParent={selectParent}
            showMove={Boolean(affordances.actionBar && singleSelected)}
            showBoxModel={affordances.boxModel}
            boxModelActive={boxModelVisible}
            onMove={() => handleAction({ tag: "move" })}
            onToggleBoxModel={() => setBoxModelVisible((v) => !v)}
          />
        )}
        {affordances.boxModel &&
          boxModelVisible &&
          fiberRegistry &&
          [...selectedIds].map((id) => (
            <BoxModelLayer key={id} registry={fiberRegistry} elementId={id} />
          ))}
        {showActionBar && singleSelected && fiberRegistry && (
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
        {affordances.actionBar &&
          pointer === "editing" &&
          singleSelected &&
          popover}
        {affordances.actionBar &&
          pointer === "inserting" &&
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
        {affordances.actionBar && morph.isOpen && singleSelected && (
          <MorphPicker
            patterns={morph.patterns}
            onHover={onMorphHover}
            onCommit={onMorphCommit}
            onClose={morph.closePicker}
            commitError={morph.commitError}
            anchorRef={morphButtonRef}
          />
        )}
        {affordances.slotStop &&
          selectedSlot &&
          slotAddress &&
          selectParent &&
          fiberRegistry && (
            <SlotStop
              registry={fiberRegistry}
              data={currentData}
              parentId={selectedSlot.parentId}
              slotKey={selectedSlot.slotKey}
              label={slotAddress}
              onClimb={selectParent}
            />
          )}
        {affordances.dropOverlay &&
          fiberRegistry &&
          (() => {
            const target = drag === "dragging" ? dropTarget : carryTarget;
            return target ? (
              <>
                <DragOverlay
                  registry={fiberRegistry}
                  data={currentData}
                  target={target}
                />
                {drag === "dragging" && cycleStatus && (
                  <CycleChip
                    registry={fiberRegistry}
                    data={currentData}
                    target={target}
                    status={cycleStatus}
                  />
                )}
              </>
            ) : null;
          })()}
        {affordances.liftPulse && liftRectRef.current && (
          <LiftPulse rect={liftRectRef.current} />
        )}
        {noTargetFlash && <NoTargetFlash point={noTargetFlash} />}
        <Announcer
          message={announcerMessage({
            data: currentData,
            drag,
            pointer,
            dropTarget,
            carryTarget,
            cycleStatus,
            slotAddress,
            noTargetFlash,
          })}
        />
        <Announcer
          assertive
          message={assertiveCarryMessage({
            data: currentData,
            drag,
            dragSourceId,
          })}
        />
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
