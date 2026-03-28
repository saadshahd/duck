import { useCallback, useEffect, useRef, useState, useMemo } from "react";
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
  type EditorAction,
} from "./selection/index.js";
import { OverlayRoot } from "./overlay/index.js";

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

  const handleAction = useCallback(
    (action: EditorAction) => {
      if (action.tag === "edit") send({ type: "OPEN_POPOVER" });
    },
    [send],
  );

  const { pointer } = state.value as { pointer: string; drag: string };
  const { hoveredId, selectedId } = state.context;

  return (
    <StateProvider initialState={{}}>
      <VisibilityProvider>
        <ActionProvider handlers={{}}>
          <Renderer spec={spec} registry={registry} />
        </ActionProvider>
      </VisibilityProvider>

      <OverlayRoot>
        {pointer === "hovering" && fiberRegistry && hoveredId && (
          <HoverHighlight registry={fiberRegistry} elementId={hoveredId} />
        )}
        {(pointer === "selected" || pointer === "editing") &&
          fiberRegistry &&
          selectedId && (
            <>
              <SelectionRing registry={fiberRegistry} elementId={selectedId} />
              {pointer === "selected" && (
                <FloatingActionBar
                  registry={fiberRegistry}
                  elementId={selectedId}
                  onAction={handleAction}
                />
              )}
            </>
          )}
      </OverlayRoot>
    </StateProvider>
  );
}
