import { useEffect, useState, useMemo } from "react";
import type { Spec } from "@json-render/core";
import {
  Renderer,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
} from "@json-render/react";
import type { ComponentRegistry } from "@json-render/react";
import { createFiberRegistry, type FiberRegistry } from "./fiber-registry.js";
import { useEditorSelection } from "./use-editor-selection.js";
import { OverlayRoot } from "./overlay-root.js";
import { HoverHighlight } from "./hover-highlight.js";
import { FloatingActionBar } from "./floating-action-bar.js";

function useFiberRegistry(
  elementIds: ReadonlySet<string>,
): FiberRegistry | null {
  const [registry, setRegistry] = useState<FiberRegistry | null>(null);

  useEffect(() => {
    const reg = createFiberRegistry(() => elementIds);
    setRegistry(reg);
    return () => reg.dispose();
  }, [elementIds]);

  return registry;
}

export function EditorShell({
  spec,
  registry,
}: {
  spec: Spec;
  registry: ComponentRegistry;
}) {
  const elementIds = useMemo(() => new Set(Object.keys(spec.elements)), [spec]);

  const fiberRegistry = useFiberRegistry(elementIds);
  const selection = useEditorSelection(fiberRegistry);

  return (
    <StateProvider initialState={{}}>
      <VisibilityProvider>
        <ActionProvider handlers={{}}>
          <Renderer spec={spec} registry={registry} />
        </ActionProvider>
      </VisibilityProvider>

      <OverlayRoot>
        {selection.tag === "hovering" && (
          <HoverHighlight rect={selection.rect} />
        )}
        {selection.tag === "selected" && (
          <>
            <HoverHighlight rect={selection.rect} />
            <FloatingActionBar rect={selection.rect} />
          </>
        )}
      </OverlayRoot>
    </StateProvider>
  );
}
