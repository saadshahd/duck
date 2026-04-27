import { useFloating, offset, shift, autoUpdate } from "@floating-ui/react";
import type { Data } from "@puckeditor/core";
import { findById, findParent } from "@json-render-editor/spec";
import { useShadowSheet, useRegistryAnchor } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import type { DropTarget } from "./drop-indicator.js";
import css from "./drag.css?inline";

export function resolveContainerId(
  data: Data,
  target: DropTarget,
): string | null {
  if (target.kind === "container") return target.elementId;
  return findParent(data, target.elementId)?.parentId ?? null;
}

type DropZoneLabelProps = {
  registry: FiberRegistry;
  data: Data;
  target: DropTarget;
};

export function DropZoneLabel({ registry, data, target }: DropZoneLabelProps) {
  useShadowSheet(css);

  const containerId = resolveContainerId(data, target);
  const containerType = containerId
    ? (findById(data, containerId)?.type ?? undefined)
    : undefined;

  const { refs, floatingStyles } = useFloating({
    placement: "top-start",
    middleware: [offset(4), shift({ padding: 8 })],
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useRegistryAnchor(refs, registry, containerId);

  if (!containerType) return null;

  return (
    <div
      ref={refs.setFloating}
      className="drop-zone-label"
      style={{ ...floatingStyles, zIndex: 1 }}
    >
      {containerType}
    </div>
  );
}
