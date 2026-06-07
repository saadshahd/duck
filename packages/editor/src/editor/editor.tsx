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
  getChildrenAt,
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
  type EditorAction,
  useActionHandler,
  useMoveInfo,
  createSelectParent,
  useToolbarYield,
} from "./selection/index.js";
import { usePropEditor } from "./prop-editor/use-prop-editor.jsx";
import { useDragReorder, DragOverlay, CycleChip } from "./drag/index.js";
import { useCarry, LiftPulse, NoTargetMarker } from "./carry/index.js";
import {
  OverlayRoot,
  Announcer,
  MoveGhost,
  measureSlot,
} from "./overlay/index.js";
import { ghostContent, slotLabels } from "./layout/index.js";
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
import { CatalogPicker, useInsert, type InsertTarget } from "./insert/index.js";
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

  const forceResolve = useCallback(
    (elementId: string) => {
      const entry = entries[currentIndex];
      if (!entry) return;
      emitOp(
        { type: "force", ids: [elementId], trigger: "force" },
        entry.id,
        currentData,
      );
    },
    [emitOp, entries, currentIndex, currentData],
  );

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
  const sheetOpenForClicks =
    (state.value as { pointer: string }).pointer === "editing" &&
    state.context.editing?.mode === "sheet";
  useEditorSelection(fiberRegistry, send, sheetOpenForClicks);
  const {
    dropTarget,
    cycleStatus,
    sourceType: dragSourceType,
    point: dragPoint,
  } = useDragReorder({
    registry: fiberRegistry,
    data: currentData,
    index,
    state,
    send,
    commit,
  });
  const {
    target: carryTarget,
    noTargetFlash,
    cycleStatus: carryCycleStatus,
    liftRect,
    sourceType: carrySourceType,
    point: carryPoint,
  } = useCarry({
    registry: fiberRegistry,
    data: currentData,
    state,
    send,
    commit,
  });
  const sheet = usePropEditor({
    registry: fiberRegistry,
    data: currentData,
    config,
    metadata,
    state,
    send,
    commit,
    forceResolve,
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
  const { hoveredId } = state.context;

  // One pointer-anchored move ghost across both modalities: it names the source,
  // the resolved destination, and validity — the single owner of that datum. The
  // active modality picks the inputs; absent a source type or point, no ghost.
  const moveGhost = useMemo(() => {
    const active =
      drag === "dragging"
        ? { sourceType: dragSourceType, point: dragPoint, target: dropTarget }
        : drag === "carrying"
          ? {
              sourceType: carrySourceType,
              point: carryPoint,
              target: carryTarget,
            }
          : null;
    if (!active || !active.sourceType || !active.point) return null;
    return {
      content: ghostContent(active.sourceType, active.target, currentData),
      point: active.point,
    };
  }, [
    drag,
    dragSourceType,
    dragPoint,
    dropTarget,
    carrySourceType,
    carryPoint,
    carryTarget,
    currentData,
  ]);

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

  const { openInsert, onInsert } = useInsert({
    data: currentData,
    config: config,
    lastSelectedId,
    pointer,
    send,
    commit,
  });

  // Insert is routed (slot-choice vs sibling) by useInsert, not the action
  // machine — so the action bar's (+) defers to openInsert; everything else is
  // the plain action handler.
  const onAction = useCallback(
    (action: EditorAction) =>
      action.tag === "insert" ? openInsert() : handleAction(action),
    [openInsert, handleAction],
  );

  useKeyboard({
    machine: send,
    history: historySend,
    nav: { data: currentData, lastSelectedId, pointer },
    clipboard,
    onDelete: () => handleAction({ tag: "delete" }),
    onInsert: openInsert,
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

  const slotInsertTarget = useMemo((): InsertTarget | null => {
    if (!selectedSlot) return null;
    const children =
      getChildrenAt(currentData, selectedSlot.parentId, selectedSlot.slotKey) ??
      [];
    return {
      parentId: selectedSlot.parentId,
      slotKey: selectedSlot.slotKey,
      index: children.length,
    };
  }, [selectedSlot, currentData]);

  // The node's slots offered for choosing, with their qualified labels. The
  // active slot owns the (+)/climb; the rest are choosable bands. Every slot is
  // named on screen — the law that no insert writes to an unnamed slot.
  const slotBands = useMemo(() => {
    if (!selectedSlot) return [];
    const labels = slotLabels(currentData, selectedSlot.parentId);
    return Object.entries(labels).map(([slotKey, label]) => ({
      slotKey,
      label,
      active: slotKey === selectedSlot.slotKey,
    }));
  }, [selectedSlot, currentData]);

  const affordances = affordancesFor(
    interactionState({
      pointer,
      drag,
      hasSelection: selectedIds.size > 0,
      hasSlot: selectedSlot !== null,
    }),
  );

  const yieldingToolbar = useToolbarYield(fiberRegistry, singleSelected);

  const operable = Boolean(affordances.actionBar && singleSelected);
  const pickerOverlayOpen = pointer === "editing" || pointer === "inserting";
  const showActionBar = operable && !yieldingToolbar && !pickerOverlayOpen;

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
    [morph],
  );
  const onMorphCommit = useCallback(
    (i: number) => morph.commit(morph.patterns[i]),
    [morph],
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
        body { user-select: none; ${sheetOpenForClicks ? "padding-right: var(--sheet-width, 320px);" : ""} }
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
          <SelectionCluster.Root
            registry={fiberRegistry}
            elementId={lastSelectedId}
            elementType={index.get(lastSelectedId)?.component.type}
            selectionCount={selectedIds.size}
            slotAddress={slotAddress}
            toolbarRef={toolbarRef}
            onSelectParent={selectParent}
          >
            {operable && singleSelected && (
              <SelectionCluster.Move
                onMove={() =>
                  send({ type: "CARRY_START", sourceId: singleSelected })
                }
              />
            )}
            {affordances.boxModel && (
              <SelectionCluster.BoxModel
                active={boxModelVisible}
                onToggle={() => setBoxModelVisible((v) => !v)}
              />
            )}
          </SelectionCluster.Root>
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
            onAction={onAction}
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
        {operable && pointer === "editing" && sheet}
        {pointer === "inserting" &&
          fiberRegistry &&
          lastSelectedId &&
          (selectedSlot ? (
            <CatalogPicker
              registry={fiberRegistry}
              anchor={{
                kind: "rect",
                rect: () =>
                  measureSlot({
                    registry: fiberRegistry,
                    data: currentData,
                    parentId: selectedSlot.parentId,
                    slotKey: selectedSlot.slotKey,
                  }),
              }}
              config={config}
              onInsert={(componentType) => {
                if (slotInsertTarget) onInsert(componentType, slotInsertTarget);
              }}
              onClose={() => send({ type: "ESCAPE" })}
            />
          ) : (
            <CatalogPicker
              registry={fiberRegistry}
              anchor={{ kind: "element", elementId: lastSelectedId }}
              config={config}
              onInsert={onInsert}
              onClose={() => send({ type: "ESCAPE" })}
            />
          ))}
        {operable && morph.isOpen && (
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
          selectParent &&
          fiberRegistry &&
          slotBands.map(({ slotKey, label, active }) => (
            <SlotStop
              key={slotKey}
              registry={fiberRegistry}
              data={currentData}
              parentId={selectedSlot.parentId}
              slotKey={slotKey}
              label={label}
              active={active}
              onClimb={selectParent}
              onChoose={() =>
                send({
                  type: "SELECT_SLOT",
                  parentId: selectedSlot.parentId,
                  slotKey,
                })
              }
              onSelectChild={(childId) =>
                send({ type: "SELECT", elementId: childId })
              }
              onInsert={() => send({ type: "OPEN_INSERT" })}
            />
          ))}
        {affordances.dropOverlay &&
          fiberRegistry &&
          (() => {
            const target = drag === "dragging" ? dropTarget : carryTarget;
            return target ? (
              <DragOverlay
                registry={fiberRegistry}
                data={currentData}
                target={target}
              />
            ) : null;
          })()}
        {affordances.cycleChip &&
          fiberRegistry &&
          dragSourceId &&
          (() => {
            const status = drag === "dragging" ? cycleStatus : carryCycleStatus;
            return status ? (
              <CycleChip
                registry={fiberRegistry}
                sourceId={dragSourceId}
                status={status}
              />
            ) : null;
          })()}
        {affordances.liftPulse && liftRect && <LiftPulse rect={liftRect} />}
        {moveGhost && (
          <MoveGhost content={moveGhost.content} point={moveGhost.point} />
        )}
        {noTargetFlash && <NoTargetMarker point={noTargetFlash} />}
        <Announcer
          message={announcerMessage({
            data: currentData,
            drag,
            pointer,
            dropTarget,
            carryTarget,
            cycleStatus,
            carryCycleStatus,
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
