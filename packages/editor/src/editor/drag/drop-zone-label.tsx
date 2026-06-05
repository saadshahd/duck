import { useFloating, offset, shift, autoUpdate } from "@floating-ui/react";
import type { Data } from "@puckeditor/core";
import { findById, findParent } from "@duckeditor/spec";
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

/** Display label for the active drop target:
 *  `Component › slot` for container drops, the parent type for line drops. */
export function resolveLabel(data: Data, target: DropTarget): string | null {
  const containerId = resolveContainerId(data, target);
  const type = containerId ? findById(data, containerId)?.type : undefined;
  if (!type) return null;
  return target.kind === "container" ? `${type} › ${target.slotKey}` : type;
}

type DropZoneLabelProps = {
  registry: FiberRegistry;
  data: Data;
  target: DropTarget;
};

export function DropZoneLabel({ registry, data, target }: DropZoneLabelProps) {
  useShadowSheet(css);

  const containerId = resolveContainerId(data, target);
  const label = resolveLabel(data, target);

  const { refs, floatingStyles } = useFloating({
    placement: "top-start",
    middleware: [offset(4), shift({ padding: 8 })],
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useRegistryAnchor(refs, registry, containerId);

  if (!label) return null;

  return (
    <div
      ref={refs.setFloating}
      className="drop-zone-label"
      style={{ ...floatingStyles, zIndex: 1 }}
    >
      {label}
    </div>
  );
}
