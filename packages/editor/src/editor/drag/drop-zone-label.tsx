import { useFloating, offset, shift, autoUpdate } from "@floating-ui/react";
import type { Spec } from "@json-render/core";
import { useShadowSheet, useRegistryAnchor } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import { findParent } from "../spec-ops/index.js";
import type { DropTarget } from "./drop-indicator.js";
import css from "./drag.css?inline";

export function resolveContainerId(
  spec: Spec,
  target: DropTarget,
): string | null {
  if (target.kind === "container") return target.elementId;
  return findParent(spec, target.elementId)
    .map(({ parentId }) => parentId)
    .unwrapOr(null);
}

type DropZoneLabelProps = {
  registry: FiberRegistry;
  spec: Spec;
  target: DropTarget;
};

export function DropZoneLabel({ registry, spec, target }: DropZoneLabelProps) {
  useShadowSheet(css);

  const containerId = resolveContainerId(spec, target);
  const containerType = containerId
    ? spec.elements[containerId]?.type
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
