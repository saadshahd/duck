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
} from "./selection/index.js";
import { usePropEditor } from "./prop-editor/use-prop-editor.jsx";
import { useDragReorder, DropIndicator } from "./drag/index.js";
import { OverlayRoot } from "./overlay/index.js";
import { BoxModelOverlay, GapOverlay, useBoxModel } from "./box-model/index.js";

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
  const elementIds = useMemo(() => new Set(Object.keys(spec.elements)), [spec]);
  const fiberRegistry = useFiberRegistry(elementIds);
  const [state, send] = useMachine(editorMachine);

  useEditorSelection(fiberRegistry, send);
  const { dropTarget } = useDragReorder({
    registry: fiberRegistry,
    spec,
    state,
    send,
    onSpecChange,
  });
  const popover = usePropEditor({
    registry: fiberRegistry,
    spec,
    state,
    send,
    onSpecChange,
    getPropSchema,
  });

  const handleAction = useActionHandler({ spec, state, send, onSpecChange });

  const { pointer, drag } = state.value as { pointer: string; drag: string };
  const { hoveredId, selectedId } = state.context;

  const showBoxModel =
    pointer === "selected" ||
    (pointer === "editing" && state.context.editing?.mode === "popover");
  const boxModel = useBoxModel(fiberRegistry, showBoxModel ? selectedId : null);

  return (
    <StateProvider initialState={{}}>
      <VisibilityProvider>
        <ActionProvider handlers={{}}>
          <Renderer spec={spec} registry={registry} />
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
                  onAction={handleAction}
                />
              )}
              {pointer === "editing" && popover}
            </>
          )}
        {drag === "dragging" && dropTarget && fiberRegistry && (
          <DropIndicator registry={fiberRegistry} target={dropTarget} />
        )}
      </OverlayRoot>
    </StateProvider>
  );
}
